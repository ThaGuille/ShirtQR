"use client";

import { useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/imageCompression";
import { getDeviceId } from "@/lib/deviceId";
import { uuid } from "@/lib/uuid";
import type { Post } from "@/lib/types";

// Reject absurd originals before we even load them into memory to compress.
// (Storage also caps the *compressed* upload at 2 MB; this is the front door.)
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024; // 25 MB

// Add to the wall: a compressed photo, or a location pin from the device GPS.
// The big binary goes straight to Storage (one hop, no serverless body limit);
// only tiny metadata touches /api/posts. onPendingChange lets the Gallery show
// a placeholder card while work is in flight; onUploaded hands back the new post.
export function UploadForm({
  onUploaded,
  onPendingChange,
}: {
  onUploaded: (post: Post) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const fileInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setPending(value: boolean) {
    setBusy(value);
    onPendingChange?.(value);
  }

  async function createPost(payload: Record<string, unknown>): Promise<Post> {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Something went wrong");
    return json.post as Post;
  }

  async function handleFile(file: File) {
    if (file.size > MAX_ORIGINAL_BYTES) {
      setError("That image is too large. Pick one under 25 MB.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const compressed = await compressImage(file);

      const supabase = createClient();
      const deviceId = getDeviceId();
      const path = `${deviceId}/${uuid()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(path, compressed, { contentType: "image/webp", upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const post = await createPost({
        type: "photo",
        imagePath: path,
        caption: caption.trim() || null,
        deviceId,
      });
      onUploaded(post);
      setCaption("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
      if (fileRef.current) fileRef.current.value = ""; // allow re-picking same file
    }
  }

  function handleLocation() {
    if (!("geolocation" in navigator)) {
      setError("This device can't share a location.");
      return;
    }
    setPending(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const post = await createPost({
            type: "location",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            caption: caption.trim() || null,
            deviceId: getDeviceId(),
          });
          onUploaded(post);
          setCaption("");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
          setPending(false);
        }
      },
      (geoErr) => {
        setPending(false);
        setError(
          geoErr.code === geoErr.PERMISSION_DENIED
            ? "Location permission denied."
            : "Couldn't get your location.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-neutral-800 p-3">
      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Add a caption (optional)"
        maxLength={280}
        disabled={busy}
        className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />

      <div className="flex gap-2">
        <input
          ref={fileRef}
          id={fileInputId}
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="hidden"
        />
        <label
          htmlFor={fileInputId}
          aria-disabled={busy}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-center text-sm font-semibold text-neutral-950 ${
            busy ? "cursor-not-allowed opacity-60" : "active:bg-emerald-400"
          }`}
        >
          {busy ? "Working…" : "📷 Add a photo"}
        </label>
        <button
          type="button"
          onClick={handleLocation}
          disabled={busy}
          className="flex shrink-0 items-center justify-center gap-1 rounded-lg border border-neutral-700 px-3 py-2.5 text-sm font-semibold text-neutral-200 active:bg-neutral-800 disabled:opacity-60"
        >
          📍 Location
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  );
}
