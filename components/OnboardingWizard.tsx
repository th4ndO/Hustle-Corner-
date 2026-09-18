"use client";

import { useState } from "react";
import { compressImage } from "@/lib/imageCompression";
import { onboardSeller } from "@/app/dashboard/become-seller/actions";
import { LIMITS } from "@/config";
import type { CategoryTag } from "@/lib/sellers";

type ServiceRow = { name: string; priceFrom: string; priceTo: string; durationMinutes: string };
type Photo = { blob: Blob; previewUrl: string };

const emptyService = (): ServiceRow => ({ name: "", priceFrom: "", priceTo: "", durationMinutes: "" });

export default function OnboardingWizard({ categories }: { categories: CategoryTag[] }) {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [areaNote, setAreaNote] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([emptyService()]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepValid = [
    businessName.trim().length >= 2,
    selectedCategories.length >= 1,
    services.length >= 1 && services.every((s) => s.name.trim() && s.priceFrom),
    photos.length >= LIMITS.minPhotosToOnboard,
    whatsappNumber.trim().length > 0 && consent,
  ][step - 1];

  function toggleCategory(slug: string) {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function updateService(index: number, patch: Partial<ServiceRow>) {
    setServices((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, LIMITS.maxPortfolioPhotos - photos.length);
    if (!files.length) return;
    setCompressing(true);
    const compressed = await Promise.all(
      files.map(async (file) => {
        const blob = await compressImage(file, { maxBytes: LIMITS.maxPhotoSizeBytes });
        return { blob, previewUrl: URL.createObjectURL(blob) };
      }),
    );
    setPhotos((prev) => [...prev, ...compressed].slice(0, LIMITS.maxPortfolioPhotos));
    setCompressing(false);
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.append("businessName", businessName);
    fd.append("bio", bio);
    fd.append("areaNote", areaNote);
    fd.append("instagramHandle", instagramHandle);
    fd.append("whatsappNumber", whatsappNumber);
    selectedCategories.forEach((slug) => fd.append("categorySlugs", slug));
    fd.append(
      "servicesJson",
      JSON.stringify(
        services.map((s) => ({
          name: s.name,
          priceFrom: s.priceFrom,
          priceTo: s.priceTo || undefined,
          durationMinutes: s.durationMinutes || undefined,
        })),
      ),
    );
    fd.append("consent", consent ? "true" : "false");
    photos.forEach((p, i) => fd.append("photos", p.blob, `photo-${i}.jpg`));

    const result = await onboardSeller(fd);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
    // On success the server action redirects, so there's nothing else to do here.
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <p className="mb-4 text-sm text-gray-500">Step {step} of 5</p>

      {step === 1 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Tell us about your business</h1>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Business name"
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, LIMITS.bioMaxChars))}
            placeholder="A short bio (max 500 characters)"
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />
          <input
            value={areaNote}
            onChange={(e) => setAreaNote(e.target.value)}
            placeholder="Area, e.g. Hatfield, near Hillcrest"
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />
          <input
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            placeholder="Instagram handle (optional)"
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">What do you offer?</h1>
          <div className="space-y-2">
            {categories.map((c) => (
              <label key={c.slug} className="flex items-center gap-3 rounded-lg border border-gray-300 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(c.slug)}
                  onChange={() => toggleCategory(c.slug)}
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Your services</h1>
          {services.map((s, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-gray-300 p-4">
              <input
                value={s.name}
                onChange={(e) => updateService(i, { name: e.target.value })}
                placeholder="Service name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={s.priceFrom}
                  onChange={(e) => updateService(i, { priceFrom: e.target.value })}
                  placeholder="Price from (R)"
                  className="w-1/2 rounded-lg border border-gray-300 px-3 py-2"
                />
                <input
                  type="number"
                  value={s.priceTo}
                  onChange={(e) => updateService(i, { priceTo: e.target.value })}
                  placeholder="Price to (optional)"
                  className="w-1/2 rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              {services.length > 1 && (
                <button
                  type="button"
                  onClick={() => setServices((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-sm text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setServices((prev) => [...prev, emptyService()])}
            className="text-sm font-medium text-brand-600"
          >
            + Add another service
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Add photos</h1>
          <p className="text-sm text-gray-500">
            Up to {LIMITS.maxPortfolioPhotos} photos of your work. They&apos;re compressed automatically.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {photos.length < LIMITS.maxPortfolioPhotos && (
            <label className="block cursor-pointer rounded-lg border border-dashed border-gray-400 px-4 py-6 text-center text-sm text-gray-500">
              {compressing ? "Compressing…" : "Tap to add photos"}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                disabled={compressing}
                className="hidden"
              />
            </label>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Almost done</h1>
          <input
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="WhatsApp number, e.g. 082 123 4567"
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />
          <label className="flex items-start gap-3 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            I agree that my WhatsApp number and business info will be shown
            publicly on {typeof window !== "undefined" ? window.location.hostname : "the site"}.
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="mt-8 flex gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 rounded-full border border-gray-300 py-3 font-medium"
          >
            Back
          </button>
        )}
        {step < 5 ? (
          <button
            type="button"
            disabled={!stepValid}
            onClick={() => setStep((s) => s + 1)}
            className="flex-1 rounded-full bg-brand-600 py-3 font-semibold text-white disabled:opacity-50"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={!stepValid || submitting}
            onClick={handleSubmit}
            className="flex-1 rounded-full bg-brand-600 py-3 font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        )}
      </div>
    </div>
  );
}
