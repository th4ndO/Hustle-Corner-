"use client";

import { useActionState, useRef } from "react";
import { addService } from "@/app/dashboard/actions";

export default function AddServiceForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => {
      const result = await addService(formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    {},
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-2 rounded-lg border border-dashed border-gray-300 p-4">
      <input name="name" placeholder="Service name" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
      <div className="flex gap-2">
        <input
          name="priceFrom"
          type="number"
          placeholder="Price from (R)"
          className="w-1/2 rounded-lg border border-gray-300 px-3 py-2"
        />
        <input
          name="priceTo"
          type="number"
          placeholder="Price to (optional)"
          className="w-1/2 rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add service"}
      </button>
    </form>
  );
}
