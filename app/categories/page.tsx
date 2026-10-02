import Link from "next/link";
import { APP_NAME } from "@/config";
import { getActiveCategories } from "@/lib/sellers";
import { categoryIcon, groupCategories } from "@/lib/categoryCatalog";
import Icon from "@/components/Icon";

export const metadata = { title: `All categories · ${APP_NAME}` };

export default async function CategoriesPage() {
  const groups = groupCategories(await getActiveCategories());

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <h1 className="text-3xl font-extrabold text-brand-600">All categories</h1>
      <p className="mt-2 text-gray-600">Every kind of student-owned business near campus, from braids to laptop repairs.</p>

      <div className="mt-8 space-y-8">
        {groups.map((group) => (
          <section key={group.name}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{group.name}</h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {group.categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/c/${c.slug}`}
                    className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-medium text-gray-900 transition hover:border-brand-500 hover:shadow-md active:scale-[0.98]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                      <Icon name={categoryIcon(c.slug)} className="h-5 w-5" />
                    </span>
                    {c.name}
                    <Icon name="arrowRight" className="ml-auto h-4 w-4 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
