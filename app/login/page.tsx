"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <main className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="mt-2 text-gray-600">
          We sent a login link to <strong>{email}</strong>. Open it on this
          device to finish logging in.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-1 text-2xl font-bold">Log in to {APP_NAME}</h1>
      <p className="mb-6 text-sm text-gray-500">
        We&apos;ll email you a link — no password needed.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-full bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Send magic link"}
        </button>
        {status === "error" && (
          <p className="text-sm text-red-600">
            Something went wrong sending that link. Try again.
          </p>
        )}
      </form>
    </main>
  );
}
