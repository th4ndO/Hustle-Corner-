"use client";

import { useActionState } from "react";
import { updateSellerBasicInfo } from "@/app/dashboard/actions";
import type { SellerDetail } from "@/lib/sellers";

export default function EditBasicInfoForm({ seller }: { seller: SellerDetail }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => updateSellerBasicInfo(formData),
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input
        name="businessName"
        defaultValue={seller.businessName}
        placeholder="Business name"
        className="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
      <textarea
        name="bio"
        defaultValue={seller.bio ?? ""}
        placeholder="Bio"
        rows={3}
        className="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
      <input
        name="areaNote"
        defaultValue={seller.areaNote ?? ""}
        placeholder="Area"
        className="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
      <input
        name="instagramHandle"
        defaultValue={seller.instagramHandle ?? ""}
        placeholder="Instagram handle"
        className="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
      <input
        name="whatsappNumber"
        defaultValue={seller.whatsappNumber}
        placeholder="WhatsApp number"
        className="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-600 px-6 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
