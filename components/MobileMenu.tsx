"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";

type MenuLink = { href: string; label: string };

// Phones only (hidden from sm up, where the header shows the links inline).
// Closes on a link tap, Escape, a tap outside, or any page change.
export default function MobileMenu({ links, loggedIn }: { links: MenuLink[]; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const itemClass =
    "block w-full px-4 py-3 text-left text-base font-medium text-white hover:bg-brand-700 focus-visible:outline-white";

  return (
    <div ref={rootRef} className="sm:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
        className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-white focus-visible:outline-white"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && (
        <nav
          id="mobile-menu"
          aria-label="Main"
          className="absolute inset-x-0 top-full border-b border-brand-700 bg-brand-600 py-2 shadow-lg"
        >
          <ul className="mx-auto max-w-2xl">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className={itemClass}>
                  {l.label}
                </Link>
              </li>
            ))}
            {loggedIn && (
              <li className="mt-1 border-t border-brand-700 pt-1">
                <form action={signOut}>
                  <button type="submit" className={`${itemClass} text-white/80`}>
                    Log out
                  </button>
                </form>
              </li>
            )}
          </ul>
        </nav>
      )}
    </div>
  );
}
