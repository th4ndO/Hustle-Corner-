"use client";

import { useActionState } from "react";
import { updateDisplayName } from "@/app/dashboard/actions";
import { DISPLAY_NAME_MAX } from "@/lib/displayName";

export default function DisplayNameForm({ currentName }: { currentName: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; saved?: boolean }, formData: FormData) => updateDisplayName(formData),
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-gray-700">
          Your name
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={currentName}
          maxLength={DISPLAY_NAME_MAX}
          autoComplete="nickname"
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <p className="mt-1.5 text-xs text-gray-500">
          Shown on your reviews and to sellers you book with.
        </p>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.saved && !state.error && <p className="text-sm text-green-700">Saved.</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-600 px-6 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}
