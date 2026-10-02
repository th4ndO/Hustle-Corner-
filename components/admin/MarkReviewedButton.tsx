"use client";

import { useTransition } from "react";
import { markSellerReviewed } from "@/app/admin/actions";

export default function MarkReviewedButton({ sellerId }: { sellerId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => { await markSellerReviewed(sellerId); })}
      className="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
    >
      {pending ? "…" : "Mark reviewed"}
    </button>
  );
}
