import Link from "next/link";
import { APP_NAME } from "@/config";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <Link href="/" className="shrink-0 text-lg font-bold text-brand-600">
          {APP_NAME}
        </Link>
        <form action="/search" method="get" className="flex flex-1 items-center">
          <input
            type="search"
            name="q"
            placeholder="Search sellers or services"
            className="w-full rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </form>
      </div>
    </header>
  );
}
