import Link from "next/link";
import { APP_NAME, CAMPUS_NAME } from "@/config";
import { getActiveCategories, getTopRatedSellers } from "@/lib/sellers";
import SellerCard from "@/components/SellerCard";

export default async function HomePage() {
  const [categories, topSellers] = await Promise.all([
    getActiveCategories(),
    getTopRatedSellers(6),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <section className="py-10 text-center">
        <h1 className="text-3xl font-bold text-brand-600">{APP_NAME}</h1>
        <p className="mx-auto mt-2 max-w-sm text-gray-600">
          Find trusted student services at {CAMPUS_NAME} — with real reviews
          from real students.
        </p>
      </section>

      {categories.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Categories
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/c/${category.slug}`}
                className="rounded-xl border border-gray-200 px-4 py-6 text-center font-medium transition hover:border-brand-500 hover:text-brand-600"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Top rated
        </h2>
        {topSellers.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {topSellers.map((seller) => (
              <SellerCard key={seller.id} seller={seller} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            No sellers yet — check back soon, or be the first to list your
            services.
          </p>
        )}
      </section>
    </main>
  );
}
