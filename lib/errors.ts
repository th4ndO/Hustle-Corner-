// Turns a Supabase / Postgres / Storage error into a message that's safe to
// show a user. Raw database messages ("stack depth limit exceeded", constraint
// names, policy names) mean nothing to a student and leak internals, so they
// are logged server-side (Vercel runtime logs) and replaced with plain text.
// Our own trigger errors (Postgres P0001, raised in the migrations) are
// already written for people, so those pass through.

type DbError = { message?: string; code?: string } | null | undefined;

const GENERIC = "Something went wrong on our side. Please try again in a moment.";

export function friendlyError(error: DbError, fallback: string = GENERIC): string {
  if (error) console.error("[friendlyError]", error.code ?? "-", error.message ?? error);
  if (error?.code === "P0001" && error.message) return error.message;
  if (error?.code === "42501") return "You don't have permission to do that.";
  return fallback;
}
