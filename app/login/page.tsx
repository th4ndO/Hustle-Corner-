"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/config";

type Mode = "login" | "signup";
type Status = "idle" | "submitting" | "error" | "check-email";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    if (data.session) {
      // Email confirmation is disabled on this project — signUp already
      // returned a live session.
      router.push("/");
      router.refresh();
      return;
    }
    setStatus("check-email");
  }

  if (status === "check-email") {
    return (
      <main className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Confirm your email</h1>
        <p className="mt-2 text-gray-600">
          We sent a confirmation link to <strong>{email}</strong>. Open it on
          this device to finish signing up.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-1 text-2xl font-bold">
        {mode === "login" ? `Log in to ${APP_NAME}` : `Sign up for ${APP_NAME}`}
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {mode === "login"
          ? "Welcome back."
          : "Create an account to leave reviews or list your services."}
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
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min. 8 characters)"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-full bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {status === "submitting"
            ? "Please wait…"
            : mode === "login"
              ? "Log in"
              : "Sign up"}
        </button>
        {status === "error" && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setStatus("idle");
          setErrorMessage("");
        }}
        className="mt-6 w-full text-center text-sm font-medium text-brand-600"
      >
        {mode === "login"
          ? "New here? Create an account"
          : "Already have an account? Log in"}
      </button>
    </main>
  );
}
