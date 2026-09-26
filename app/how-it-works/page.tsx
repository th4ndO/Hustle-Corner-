import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME, LIMITS } from "@/config";

export const metadata = {
  title: `How it works · ${APP_NAME}`,
  description: `A step-by-step guide to ${APP_NAME}, for customers and for business owners.`,
};

type Step = { title: string; body: ReactNode };

const linkClass = "font-medium text-brand-600 underline";

const CUSTOMER_STEPS: Step[] = [
  {
    title: "Find a seller",
    body: (
      <>
        Tap a category on the{" "}
        <Link href="/" className={linkClass}>
          home page
        </Link>
        , or type what you need (e.g. &quot;braids&quot;) into the search bar
        at the top of any page. You don&apos;t need an account to browse.
      </>
    ),
  },
  {
    title: "Open their profile",
    body: "Tap a seller to see their photos, services, price ranges, area and reviews from other students.",
  },
  {
    title: "Message them on WhatsApp",
    body: (
      <>
        Tap <strong>Message on WhatsApp</strong>. WhatsApp opens with a short
        hello already typed, so you can ask about prices, times and details
        directly.
      </>
    ),
  },
  {
    title: "Or request an appointment",
    body: (
      <>
        If the seller has set their availability, you&apos;ll see{" "}
        <strong>Book an appointment</strong> on their profile. Log in, pick an
        open time (and a service if you know it), add a note, and tap{" "}
        <strong>Request appointment</strong>. It stays{" "}
        <em>Waiting for confirmation</em> until the seller confirms it.
      </>
    ),
  },
  {
    title: "Track your bookings",
    body: (
      <>
        Tap <strong>Bookings</strong> in the top bar to see every request and
        whether it&apos;s confirmed, declined or cancelled. You can cancel a
        booking there if your plans change.
      </>
    ),
  },
  {
    title: "Meet up safely and pay the seller directly",
    body: (
      <>
        {APP_NAME} doesn&apos;t take payments: you pay the seller however you
        agree between you. Meet somewhere public and avoid big upfront
        deposits. Read our{" "}
        <Link href="/safety" className={linkClass}>
          safety tips
        </Link>
        .
      </>
    ),
  },
  {
    title: "Leave a review",
    body: (
      <>
        Log in, go back to the seller&apos;s profile, pick a star rating, say
        how it went and tap <strong>Submit review</strong>. Honest reviews
        help other students choose. If something went wrong, use{" "}
        <strong>Report this listing</strong> at the bottom of the profile
        (also only shown when you&apos;re logged in).
      </>
    ),
  },
];

const BUSINESS_STEPS: Step[] = [
  {
    title: "Create your account",
    body: (
      <>
        Tap <strong>Log in</strong> in the top bar, switch to sign up, and
        create an account with your email and a strong password.
      </>
    ),
  },
  {
    title: "Open your dashboard",
    body: (
      <>
        Once you&apos;re logged in, tap <strong>Dashboard</strong> in the top
        bar, then <strong>List your first service</strong>. Setup takes about
        5 minutes, and your progress is saved on your device if you need to
        stop halfway.
      </>
    ),
  },
  {
    title: "Tell us about your business",
    body: "Add your business name, a short bio, the area you work from, your Instagram (optional), and pick the categories you offer.",
  },
  {
    title: "Add your services and prices",
    body: (
      <>
        Add at least one service with a starting price. You can add a
        &quot;price to&quot; for a range and how long it takes. Tap{" "}
        <strong>+ Add another service</strong> for more.
      </>
    ),
  },
  {
    title: "Show off your work",
    body: `Upload at least 1 and up to ${LIMITS.maxPortfolioPhotos} photos of your work. They're compressed automatically, so phone photos are fine.`,
  },
  {
    title: "Add your WhatsApp number and submit",
    body: (
      <>
        Enter the WhatsApp number customers should message, agree that it and
        your business info will be shown publicly, and tap{" "}
        <strong>Submit for review</strong>.
      </>
    ),
  },
  {
    title: "Wait for approval",
    body: (
      <>
        Your dashboard shows <em>Pending review</em> while we check your
        listing. Once it says <em>Live</em>, students can find you in search
        and in your categories.
      </>
    ),
  },
  {
    title: "Set your availability (optional)",
    body: (
      <>
        Under <strong>Availability</strong> on your dashboard, add the days
        and hours you work and how long each slot is. Customers can then
        request those times from your profile. Skip this if you&apos;d rather
        arrange everything on WhatsApp.
      </>
    ),
  },
  {
    title: "Handle booking requests",
    body: (
      <>
        New requests appear under <strong>Appointments</strong> on your
        dashboard. Tap <strong>Confirm</strong> or <strong>Decline</strong>.
        You won&apos;t get an email or SMS about new requests yet, so check
        your dashboard regularly.
      </>
    ),
  },
  {
    title: "Keep your listing fresh and track interest",
    body: "Edit your details, services and photos from the dashboard at any time. The Stats panel shows how many people viewed your profile and tapped your WhatsApp button in the last 7 and 30 days.",
  },
];

const TABS = [
  { key: "customers", label: "I'm looking for a service", steps: CUSTOMER_STEPS },
  { key: "business", label: "I run a business", steps: BUSINESS_STEPS },
] as const;

export default async function HowItWorksPage({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  const { for: audience } = await searchParams;
  const active = TABS.find((t) => t.key === audience) ?? TABS[0];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">How {APP_NAME} works</h1>
      <p className="mb-6 text-gray-600">
        A step-by-step guide. Pick the one that fits you.
      </p>

      <nav aria-label="Guide type" className="mb-8 grid grid-cols-2 gap-2 rounded-full bg-gray-100 p-1">
        {TABS.map((tab) => {
          const selected = tab.key === active.key;
          return (
            <Link
              key={tab.key}
              href={`/how-it-works?for=${tab.key}`}
              aria-current={selected ? "page" : undefined}
              scroll={false}
              className={`rounded-full px-3 py-2 text-center text-sm font-medium transition ${
                selected ? "bg-white text-brand-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <ol className="space-y-3">
        {active.steps.map((step, i) => (
          <li key={step.title} className="flex items-start gap-3 rounded-xl border border-gray-200 p-4">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white"
            >
              {i + 1}
            </span>
            <div>
              <h2 className="font-medium text-gray-900">{step.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 text-center">
        {active.key === "customers" ? (
          <Link href="/" className="inline-block rounded-full bg-brand-600 px-6 py-3 font-semibold text-white">
            Start browsing
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="inline-block rounded-full bg-brand-600 px-6 py-3 font-semibold text-white"
          >
            List your business
          </Link>
        )}
      </div>
    </main>
  );
}
