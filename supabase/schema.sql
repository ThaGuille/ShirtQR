-- ShirtQR database schema
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- It is idempotent: safe to run more than once.

-- =========================================================================
-- TABLES
-- =========================================================================

-- A post is one photo or one location, submitted by anyone (or by you).
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('photo', 'location')),
  image_path  text,                       -- Storage path (for type = 'photo')
  caption     text,
  lat         double precision,           -- for type = 'location'
  lng         double precision,
  device_id   text,                       -- anonymous submitter (not trusted)
  vote_count  integer not null default 0, -- denormalized for fast reads
  hidden      boolean not null default false, -- admin soft-delete
  featured    boolean not null default false, -- admin highlight
  created_at  timestamptz not null default now()
);

-- Hot path: "show visible posts, most-voted first".
create index if not exists posts_visible_votes_idx
  on public.posts (hidden, vote_count desc, created_at desc);

-- One vote per device per post (the primary key enforces it).
create table if not exists public.votes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  device_id  text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, device_id)
);

-- Single-row site config that the /admin page controls.
create table if not exists public.config (
  id         boolean primary key default true check (id),  -- forces one row
  title      text not null default 'Scan & Share',
  message    text,
  active     boolean not null default true,  -- master on/off switch
  updated_at timestamptz not null default now()
);
insert into public.config (id) values (true) on conflict (id) do nothing;

-- =========================================================================
-- VOTING RPC  (atomic, dedupes by device)
-- =========================================================================
-- security definer -> runs as owner so anon can vote without write access to
-- the votes table directly. Returns the new vote_count (or current if dupe).
create or replace function public.cast_vote(p_post_id uuid, p_device_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.votes (post_id, device_id)
  values (p_post_id, p_device_id)
  on conflict (post_id, device_id) do nothing;

  if found then
    update public.posts
      set vote_count = vote_count + 1
      where id = p_post_id
      returning vote_count into v_count;
  else
    select vote_count into v_count from public.posts where id = p_post_id;
  end if;

  return coalesce(v_count, 0);
end;
$$;

-- =========================================================================
-- ROW LEVEL SECURITY
-- The anon key is public (shipped to the browser), so RLS is what actually
-- protects the data. Anyone can READ visible posts and ADD posts; nobody can
-- edit/delete via the anon key. Deletes/hides happen with the service role
-- key on the server (which bypasses RLS).
-- =========================================================================
alter table public.posts  enable row level security;
alter table public.votes  enable row level security;
alter table public.config enable row level security;

-- posts: read only the visible ones
drop policy if exists "read visible posts" on public.posts;
create policy "read visible posts" on public.posts
  for select to anon using (hidden = false);

-- posts: anyone can submit (insert), but not as hidden/featured/pre-voted
drop policy if exists "anyone can post" on public.posts;
create policy "anyone can post" on public.posts
  for insert to anon
  with check (hidden = false and featured = false and vote_count = 0);

-- votes: writes go through cast_vote() only; reads not needed by clients
-- (no anon policies = no direct access).

-- config: read the single row
drop policy if exists "read config" on public.config;
create policy "read config" on public.config
  for select to anon using (true);

-- =========================================================================
-- GRANTS
-- RLS decides WHICH rows a role can see; a GRANT decides whether the role can
-- touch the table at all. Supabase does not always auto-grant on new projects,
-- so we are explicit. (Re-running these is harmless.)
-- =========================================================================
grant usage on schema public to anon, authenticated, service_role;

-- Public visitors (anon key): read config, read + add posts, cast votes.
-- No direct access to the votes table — votes go through cast_vote() only.
grant select on public.config to anon, authenticated;
grant select, insert on public.posts to anon, authenticated;
grant execute on function public.cast_vote(uuid, text) to anon, authenticated;

-- Server admin (service role): full access. It bypasses RLS but still needs
-- the table grants.
grant all on public.posts, public.votes, public.config to service_role;
grant execute on function public.cast_vote(uuid, text) to service_role;

-- =========================================================================
-- STORAGE  (public bucket for photos)
-- file_size_limit + allowed_mime_types enforce the upload cap AT THE SOURCE:
-- Storage itself rejects anything too big or not an image, even if a client
-- skips our app entirely. We compress to ~0.5 MB in-browser, so 2 MB is plenty
-- of headroom. The UPDATE applies these to an already-existing bucket too
-- (the INSERT's ON CONFLICT DO NOTHING won't touch one that's already there).
-- =========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos', 'photos', true,
  2097152,  -- 2 MB
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

update storage.buckets
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
  where id = 'photos';

drop policy if exists "public read photos" on storage.objects;
create policy "public read photos" on storage.objects
  for select to anon using (bucket_id = 'photos');

drop policy if exists "anyone can upload photos" on storage.objects;
create policy "anyone can upload photos" on storage.objects
  for insert to anon with check (bucket_id = 'photos');
