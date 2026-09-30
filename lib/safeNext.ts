// Where to send someone after they log in or sign up, taken from ?next=.
// Only same-site paths are allowed: "/dashboard" is fine, but "//evil.com",
// "/\evil.com" and "https://evil.com" would turn the login page into an open
// redirect, so anything that isn't a plain local path falls back to "/".
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return "/";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (/[\u0000-\u001f\\]/.test(next)) return "/";
  return next;
}

export function loginHref(next: string, mode?: "signup"): string {
  const params = new URLSearchParams({ next });
  if (mode) params.set("mode", mode);
  return `/login?${params.toString()}`;
}
