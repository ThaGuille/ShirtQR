"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const INITIAL: LoginState = {};

// The password gate. Server Action does the check; useActionState surfaces a
// "wrong password" message without a full custom client flow.
export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, INITIAL);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-4">
      <form action={formAction} className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-sm text-neutral-400">Enter the password to continue.</p>
        </div>

        <input
          type="password"
          name="password"
          autoFocus
          required
          placeholder="Password"
          className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />

        {state.error && <p className="text-sm text-red-400">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 active:bg-emerald-400 disabled:opacity-60"
        >
          {pending ? "Unlocking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}
