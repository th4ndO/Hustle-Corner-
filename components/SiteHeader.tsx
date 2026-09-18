import Link from "next/link";
import { APP_NAME } from "@/config";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-10 border-b border-brand-700 bg-brand-600">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <Link href="/" className="shrink-0 text-lg font-bold text-white">
          {APP_NAME}
        </Link>
        <form action="/search" method="get" className="flex flex-1 items-center">
          <input
            type="search"
            name="q"
            placeholder="Search sellers or services"
            className="w-full rounded-full border border-brand-500 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-white focus:outline-none"
          />
        </form>
        {user ? (
          <form action={signOut} className="shrink-0">
            <button type="submit" className="text-sm text-white/80 hover:text-white">
              Log out
            </button>
          </form>
        ) : (
          <Link href="/login" className="shrink-0 text-sm font-medium text-white">
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
