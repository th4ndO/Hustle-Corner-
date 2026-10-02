"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import Icon, { type IconName } from "@/components/Icon";

export type MenuIcon = IconName;
type MenuLink = { href: string; label: string; icon: MenuIcon };

// Phones only (hidden from sm up, where the header shows the links inline).
// When open it fills the screen below the header and the page behind it
// stops scrolling. Closes on a link tap, Escape, or any page change.
export default function MobileMenu({ links, loggedIn }: { links: MenuLink[]; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(0);
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  // Start the panel at the header's bottom edge (the header is two rows tall
  // on phones, so measure rather than guess). Layout effect, so the panel
  // never paints over the header for a frame.
  useLayoutEffect(() => {
    if (!open) return;
    const header = rootRef.current?.closest("header");
    const measure = () => setTop(header ? header.getBoundingClientRect().bottom : 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Move focus into the menu so keyboard and screen-reader users land on it.
    navRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    // Turning a phone sideways can cross the sm breakpoint, which hides the
    // menu; close it so the page doesn't stay scroll-locked.
    const wide = window.matchMedia("(min-width: 640px)");
    const onWide = () => wide.matches && setOpen(false);
    wide.addEventListener("change", onWide);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      wide.removeEventListener("change", onWide);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const itemClass =
    "flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left text-lg font-medium text-white hover:bg-brand-700 focus-visible:outline-white";

  return (
    <div ref={rootRef} className="sm:hidden">
      <button
        ref={buttonRef}
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
      {/* Always rendered so aria-controls points at a real element. */}
      <nav
        ref={navRef}
        id="mobile-menu"
        aria-label="Main"
        hidden={!open}
        style={{ top }}
        className="fixed inset-x-0 bottom-0 overflow-y-auto overscroll-contain bg-brand-600 px-2 pb-8 pt-2"
      >
        <ul className="mx-auto max-w-2xl space-y-1">
          {links.map((l) => {
            const current = pathname === l.href;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={current ? "page" : undefined}
                  className={`${itemClass} ${current ? "bg-brand-700" : ""}`}
                >
                  <Icon name={l.icon} />
                  {l.label}
                </Link>
              </li>
            );
          })}
          {loggedIn && (
            <li className="mt-2 border-t border-brand-700 pt-2">
              <form action={signOut}>
                <button type="submit" className={`${itemClass} text-white/80`}>
                  <Icon name="logout" />
                  Log out
                </button>
              </form>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
