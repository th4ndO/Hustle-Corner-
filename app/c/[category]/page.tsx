import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSellersByCategory, getActiveCategories, type CategorySort } from "@/lib/sellers";
import SellerCard from "@/components/SellerCard";
import EmptyState from "@/components/EmptyState";
import { categoryIcon } from "@/lib/categoryIcon";
import { APP_NAME, CAMPUS_NAME } from "@/config";

const SORT_OPTIONS: { value: CategorySort; label: string }[] = [
  { value: "rating", label: "Top rated" },
  { value: "price", label: "Price: low to high" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const categories = await getActiveCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return { title: `Category not found · ${APP_NAME}` };

  return {
    title: `${category.name} · ${APP_NAME}`,
    description: `${category.name} sellers at ${CAMPUS_NAME} on ${APP_NAME}.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { category: categorySlug } = await params;
  const sp = await searchParams;

  const minPrice = sp.minPrice ? Number(sp.minPrice) : undefined;
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const minRating = sp.minRating ? Number(sp.minRating) : undefined;
  const sort = (typeof sp.sort === "string" ? sp.sort : "rating") as CategorySort;

  const { category, sellers } = await getSellersByCategory(categorySlug, {
    minPrice,
    maxPrice,
    minRating,
    sort,
  });

  if (!category) notFound();
  const filtered = minPrice != null || maxPrice != null || minRating != null;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <h1 className="mb-4 text-2xl font-bold">{category.name}</h1>

      {/* Two even columns on phones, one row from sm up; every control is the
          same height. */}
      <form className="mb-6 grid grid-cols-2 gap-2 text-sm sm:flex" action={`/c/${categorySlug}`}>
        <input
          type="number"
          name="minPrice"
          placeholder="Min R"
          defaultValue={sp.minPrice as string}
          aria-label="Minimum price in rand"
          inputMode="numeric"
          className="h-11 w-full rounded-lg border border-field bg-white px-3 text-sm sm:w-28"
        />
        <input
          type="number"
          name="maxPrice"
          placeholder="Max R"
          defaultValue={sp.maxPrice as string}
          aria-label="Maximum price in rand"
          inputMode="numeric"
          className="h-11 w-full rounded-lg border border-field bg-white px-3 text-sm sm:w-28"
        />
        <select
          name="minRating"
          aria-label="Minimum rating"
          defaultValue={sp.minRating as string}
          className="h-11 w-full rounded-lg border border-field bg-white px-3 text-sm sm:w-auto"
        >
          <option value="">Any rating</option>
          <option value="3">3+ stars</option>
          <option value="4">4+ stars</option>
        </select>
        <select
          name="sort"
          aria-label="Sort by"
          defaultValue={sort}
          className="h-11 w-full rounded-lg border border-field bg-white px-3 text-sm sm:w-auto"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="col-span-2 h-11 rounded-full bg-brand-600 px-6 font-semibold text-white transition hover:bg-brand-700 sm:col-span-1"
        >
          Apply
        </button>
      </form>

      {sellers.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {sellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={filtered ? "search" : categoryIcon(categorySlug)}
          title={filtered ? "Nothing matches these filters" : `No ${category.name.toLowerCase()} sellers yet`}
          body={
            filtered
              ? "Try a wider price range or a lower rating."
              : "New student businesses are joining. Check back soon, or look in another category."
          }
          action={
            filtered
              ? { href: `/c/${categorySlug}`, label: "Clear filters" }
              : { href: "/#browse", label: "Browse other categories" }
          }
        />
      )}
    </main>
  );
}
