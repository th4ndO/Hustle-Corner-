// Supabase Auth messages are mostly readable, but a few are jargon or look
// contradictory next to the password checklist on the sign-up form.
export function authMessage(message: string): string {
  if (/rate limit/i.test(message)) return "Too many attempts right now. Please wait a few minutes and try again.";
  if (/already registered/i.test(message)) return "That email already has an account. Log in instead.";
  // Leaked-password protection: the password meets every rule on the form
  // but appears in a known data leak from another website.
  if (/known to be weak|pwned|leaked/i.test(message)) {
    return "This password has appeared in a data leak on another website, so it's easy to guess. Choose one you haven't used anywhere else.";
  }
  return message;
}
