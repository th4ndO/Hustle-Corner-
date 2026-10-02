"use client";

import { useActionState, useState } from "react";
import { updateSellerCategories } from "@/app/dashboard/actions";
import type { CategoryTag } from "@/lib/sellers";
import CategoryPicker from "@/components/CategoryPicker";

export default function EditCategoriesForm({
  categories,
  initialSlugs,
  initialOther,
}: {
  categories: CategoryTag[];
  initialSlugs: string[];
  initialOther: string;
}) {
  const [selected, setSelected] = useState(initialSlugs);
  const [other, setOther] = useState(initialOther);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; saved?: boolean }, formData: FormData) => updateSellerCategories(formData),
    {},
  );

  function toggle(slug: string) {
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  return (
    <form action={formAction} className="space-y-4">
      {selected.map((slug) => (
        <input key={slug} type="hidden" name="categorySlugs" value={slug} />
      ))}
      <CategoryPicker
        categories={categories}
        selected={selected}
        onToggle={toggle}
        otherCategory={other}
        onOtherCategoryChange={setOther}
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.saved && !state.error && <p className="text-sm text-green-700">Saved.</p>}
      <button
        type="submit"
        disabled={pending || selected.length === 0}
        className="rounded-full bg-brand-600 px-6 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save categories"}
      </button>
    </form>
  );
}
