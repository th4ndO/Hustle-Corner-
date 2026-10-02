"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/config";
import { passwordRequirements, isStrongPassword } from "@/lib/validation";
import { safeNext } from "@/lib/safeNext";
import { authMessage } from "@/lib/authMessage";
import { checkDisplayName, DISPLAY_NAME_MAX } from "@/lib/displayName";

// Read ?next= and ?mode= from the URL on the client (no useSearchParams, so
// the page needs no Suspense boundary).
function readParams(): { next: string; mode: string | null } {
  const params = new URLSearchParams(window.location.search);
  return { next: safeNext(params.get("next")), mode: params.get("mode") };
}

type Mode = "login" | "signup";
type Status = "idle" | "submitting" | "error" | "check-email";

const inputClassName =
  "w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-brand-500";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Arriving via "List your business" (?mode=signup) opens straight on sign-up.
  useEffect(() => {
    if (readParams().mode === "signup") setMode("signup");
  }, []);

  const requirements = passwordRequirements(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canSubmitSignup = isStrongPassword(password) && passwordsMatch;

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login");
    setConfirmPassword("");
    setStatus("idle");
    setErrorMessage("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    const nameCheck = checkDisplayName(name);
    if (mode === "signup" && "error" in nameCheck) {
      setStatus("error");
      setErrorMessage(nameCheck.error);
      return;
    }

    if (mode === "signup" && !canSubmitSignup) {
      setStatus("error");
      setErrorMessage(
        !isStrongPassword(password)
          ? "Choose a stronger password."
          : "Passwords don't match.",
      );
      return;
    }

    setStatus("submitting");
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus("error");
        setErrorMessage(authMessage(error.message));
        return;
      }
      // Back to wherever they were headed (e.g. the listing wizard, a seller page).
      router.push(readParams().next);
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // handle_new_user copies this into profiles.full_name, the name shown
        // on reviews and to sellers. Without it, the email username is used.
        data: { full_name: "name" in nameCheck ? nameCheck.name : undefined },
      },
    });
    if (error) {
      setStatus("error");
      setErrorMessage(authMessage(error.message));
      return;
    }
    if (data.session) {
      // Email confirmation is disabled on this project — signUp already
      // returned a live session.
      router.push(readParams().next);
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

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "signup" && (
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
              Your name
            </label>
            <input
              id="name"
              type="text"
              required
              autoComplete="nickname"
              maxLength={DISPLAY_NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lerato M"
              className={inputClassName}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Shown on your reviews and to sellers you book with. A first name or nickname is fine.
            </p>
          </div>
        )}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Create a password" : "Password"}
            className={inputClassName}
          />
          {mode === "signup" && password.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs">
              {requirements.map((r) => (
                <li
                  key={r.label}
                  className={r.met ? "text-green-600" : "text-gray-400"}
                >
                  {r.met ? "✓" : "○"} {r.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        {mode === "signup" && (
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className={
                confirmPassword.length > 0 && !passwordsMatch
                  ? `${inputClassName} border-red-400`
                  : inputClassName
              }
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1.5 text-xs text-red-600">Passwords don&apos;t match.</p>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={status === "submitting" || (mode === "signup" && !canSubmitSignup)}
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

      <button type="button" onClick={switchMode} className="mt-6 w-full text-center text-sm font-medium text-brand-600">
        {mode === "login"
          ? "New here? Create an account"
          : "Already have an account? Log in"}
      </button>
    </main>
  );
}
