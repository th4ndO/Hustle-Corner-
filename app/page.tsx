import Link from "next/link";
import { CAMPUS_NAME } from "@/config";
import { getActiveCategories, getTopRatedSellers } from "@/lib/sellers";
import { categoryIcon } from "@/lib/categoryIcon";
import SellerCard from "@/components/SellerCard";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";

const STEPS = [
  {
    icon: "search" as const,
    title: "Find a seller",
    body: "Browse by category or search for what you need.",
  },
  {
    icon: "chat" as const,
    title: "Message on WhatsApp",
    body: "Chat directly, or request an appointment if they take bookings. You pay the seller directly, never through the site.",
  },
  {
    icon: "star" as const,
    title: "Get it done",
    body: "Meet up, get your service, then leave a review to help other students.",
  },
];

const EYEBROW = "mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500";

export default async function HomePage() {
  const [categories, topSellers] = await Promise.all([
    getActiveCategories(),
    getTopRatedSellers(6),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      {/* Hero: one headline, one line, one main action. */}
      <section className="pb-10 pt-10 text-center sm:pt-14">
        <h1 className="text-4xl font-extrabold leading-[1.05] text-brand-600 sm:text-5xl">
          Find student hustles near campus
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-gray-600">
          Real students at {CAMPUS_NAME} offering real services. Message them
          directly on WhatsApp, no app, no middleman.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="#browse"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3.5 font-semibold text-white shadow-sm transition hover:bg-brand-700 hover:shadow-md active:scale-95 sm:w-auto"
          >
            Browse services
            <Icon name="arrowRight" className="h-5 w-5" />
          </Link>
          <Link
            href="/how-it-works?for=business"
            className="inline-flex w-full items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3.5 font-semibold text-brand-600 transition hover:border-brand-600 active:scale-95 sm:w-auto"
          >
            List your business free
          </Link>
        </div>
      </section>

      {categories.length > 0 && (
        <section id="browse" className="mb-12 scroll-mt-32">
          <h2 className={EYEBROW}>Categories</h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/c/${category.slug}`}
                className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 font-semibold text-gray-900 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md active:scale-[0.98]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                  <Icon name={categoryIcon(category.slug)} />
                </span>
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-12">
        {/* "Top rated" only once someone has actually been rated; until then
            the list is just the newest sellers, so say so. */}
        <h2 className={EYEBROW}>
          {topSellers.some((s) => s.reviewCount > 0) ? "Top rated" : "New sellers"}
        </h2>
        {topSellers.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {topSellers.map((seller) => (
              <SellerCard key={seller.id} seller={seller} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="sparkles"
            title="No sellers yet"
            body="The first student businesses are signing up now. Got a hustle? Be one of the first."
            action={{ href: "/how-it-works?for=business", label: "List your business" }}
          />
        )}
      </section>

      <section>
        <h2 className={EYEBROW}>How it works</h2>
        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-4 rounded-2xl border border-gray-200 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Icon name={step.icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">
                  <span className="sr-only">Step {i + 1}: </span>
                  {step.title}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-gray-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm">
          <Link href="/how-it-works" className="text-link">
            Read the step-by-step guide
          </Link>
        </p>
      </section>
    </main>
  );
}
