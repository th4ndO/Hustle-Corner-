"use client";

import { LIMITS } from "@/config";
import type { CategoryTag } from "@/lib/sellers";
import { categoryIcon, groupCategories } from "@/lib/categoryCatalog";
import { OTHER_CATEGORY_MAX, OTHER_SLUG } from "@/lib/categorySelection";
import Icon from "@/components/Icon";

// Grouped, selectable category chips (up to LIMITS.maxCategories). Picking
// "Other" asks what it is. Used by the listing wizard and the dashboard.
export default function CategoryPicker({
  categories,
  selected,
  onToggle,
  otherCategory,
  onOtherCategoryChange,
}: {
  categories: CategoryTag[];
  selected: string[];
  onToggle: (slug: string) => void;
  otherCategory: string;
  onOtherCategoryChange: (value: string) => void;
}) {
  const max = LIMITS.maxCategories;

  return (
    <fieldset>
      <legend className="text-sm font-medium text-gray-700">What do you offer?</legend>
      <p className="mb-3 mt-1 text-xs text-gray-500">
        Pick up to {max}. Not listed? Choose <strong>Other</strong> and say what it is.
      </p>
      <div className="space-y-4">
        {groupCategories(categories).map((group) => (
          <div key={group.name}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{group.name}</p>
            <div className="flex flex-wrap gap-2">
              {group.categories.map((c) => {
                const checked = selected.includes(c.slug);
                const full = !checked && selected.length >= max;
                return (
                  <label
                    key={c.slug}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-500 ${
                      checked
                        ? "border-brand-600 bg-brand-600 font-medium text-white"
                        : full
                          ? "cursor-not-allowed border-gray-200 text-gray-400"
                          : "border-field text-gray-800 hover:border-brand-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      disabled={full}
                      onChange={() => onToggle(c.slug)}
                    />
                    <Icon name={categoryIcon(c.slug)} className="h-4 w-4" />
                    {c.name}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {selected.includes(OTHER_SLUG) && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <label htmlFor="otherCategory" className="mb-1.5 block text-sm font-medium text-gray-700">
            What is your Other category?
          </label>
          <input
            id="otherCategory"
            name="otherCategory"
            value={otherCategory}
            onChange={(e) => onOtherCategoryChange(e.target.value.slice(0, OTHER_CATEGORY_MAX))}
            maxLength={OTHER_CATEGORY_MAX}
            required
            placeholder="e.g. Car washing"
            className="w-full rounded-lg border border-field bg-white px-4 py-3"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Shown on your listing instead of &quot;Other&quot;, and students can search for it.
          </p>
          <p className="mt-2 text-xs text-amber-900">
            Not allowed: writing assignments or essays for others, loans, alcohol, lifts for money, or reselling
            phones and laptops.
          </p>
        </div>
      )}
    </fieldset>
  );
}
