"use client";

import { useEffect, useState } from "react";
import { compressImage } from "@/lib/imageCompression";
import { onboardSeller } from "@/app/dashboard/become-seller/actions";
import { LIMITS } from "@/config";
import type { CategoryTag } from "@/lib/sellers";

type ServiceRow = { name: string; priceFrom: string; priceTo: string; durationMinutes: string };
type Photo = { blob: Blob; previewUrl: string };

const emptyService = (): ServiceRow => ({ name: "", priceFrom: "", priceTo: "", durationMinutes: "" });

const TOTAL_STEPS = 4;
const BUSINESS_NAME_MAX = 100;
const AREA_NOTE_MAX = 100;
const INSTAGRAM_HANDLE_MAX = 50;

const DRAFT_KEY = "campushustle:onboarding-draft";

// Photos (Blobs) can't be JSON-serialized into localStorage, so the draft
// only covers the fields that are actually painful to retype -- resuming
// just means re-adding photos, not starting the whole form over.
type Draft = {
  step: number;
  businessName: string;
  bio: string;
  areaNote: string;
  instagramHandle: string;
  selectedCategories: string[];
  services: ServiceRow[];
  whatsappNumber: string;
  consent: boolean;
};

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function saveDraft(draft: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage unavailable (private browsing, quota, etc.) -- fine to skip.
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to do if this fails -- the draft just outlives the session.
  }
}

export default function OnboardingWizard({ categories }: { categories: CategoryTag[] }) {
  const [step, setStep] = useState(1);
  const [touchedStep, setTouchedStep] = useState(false);
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
  const [restoredDraft, setRestoredDraft] = useState(false);

  // Restore a draft once, on first mount, client-side only.
  useEffect(() => {
    const draft = loadDraft();
    if (!draft) return;
    setStep(Math.min(Math.max(draft.step, 1), TOTAL_STEPS));
    setBusinessName(draft.businessName ?? "");
    setBio(draft.bio ?? "");
    setAreaNote(draft.areaNote ?? "");
    setInstagramHandle(draft.instagramHandle ?? "");
    setSelectedCategories(draft.selectedCategories ?? []);
    setServices(draft.services?.length ? draft.services : [emptyService()]);
    setWhatsappNumber(draft.whatsappNumber ?? "");
    setConsent(draft.consent ?? false);
    setRestoredDraft(true);
  }, []);

  // Persist everything but photos on every change.
  useEffect(() => {
    saveDraft({
      step,
      businessName,
      bio,
      areaNote,
      instagramHandle,
      selectedCategories,
      services,
      whatsappNumber,
      consent,
    });
  }, [step, businessName, bio, areaNote, instagramHandle, selectedCategories, services, whatsappNumber, consent]);

  const stepValid = [
    businessName.trim().length >= 2 && selectedCategories.length >= 1,
    services.length >= 1 && services.every((s) => s.name.trim() && s.priceFrom),
    photos.length >= LIMITS.minPhotosToOnboard,
    whatsappNumber.trim().length > 0 && consent,
  ][step - 1];

  function stepErrorMessage(): string | null {
    switch (step) {
      case 1:
        if (businessName.trim().length < 2) return "Enter a business name (at least 2 characters).";
        if (selectedCategories.length < 1) return "Pick at least one category.";
        return null;
      case 2:
        if (!services.every((s) => s.name.trim() && s.priceFrom)) {
          return "Give each service a name and a starting price.";
        }
        return null;
      case 3:
        if (photos.length < LIMITS.minPhotosToOnboard) {
          return `Add at least ${LIMITS.minPhotosToOnboard} photo${LIMITS.minPhotosToOnboard === 1 ? "" : "s"}.`;
        }
        return null;
      case 4:
        if (!whatsappNumber.trim()) return "Add your WhatsApp number.";
        if (!consent) return "You need to agree before submitting.";
        return null;
      default:
        return null;
    }
  }

  function goToStep(next: number) {
    setStep(next);
    setTouchedStep(false);
  }

  function handleNext() {
    if (!stepValid) {
      setTouchedStep(true);
      return;
    }
    goToStep(step + 1);
  }

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
    if (!stepValid) {
      setTouchedStep(true);
      return;
    }

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

    clearDraft();

    const result = await onboardSeller(fd);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
    // On success the server action redirects, so there's nothing else to do here.
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <div className="mb-4">
        <p className="mb-2 text-sm text-gray-500">Step {step} of {TOTAL_STEPS}</p>
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-brand-600" : "bg-gray-200"}`}
            />
          ))}
        </div>
        {restoredDraft && step === 1 && (
          <p className="mt-2 text-xs text-gray-500">Picked up where you left off.</p>
        )}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Tell us about your business</h1>
          <div>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value.slice(0, BUSINESS_NAME_MAX))}
              placeholder="Business name"
              maxLength={BUSINESS_NAME_MAX}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {businessName.length}/{BUSINESS_NAME_MAX}
            </p>
          </div>
          <div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, LIMITS.bioMaxChars))}
              placeholder="A short bio"
              rows={4}
              maxLength={LIMITS.bioMaxChars}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {bio.length}/{LIMITS.bioMaxChars}
            </p>
          </div>
          <div>
            <input
              value={areaNote}
              onChange={(e) => setAreaNote(e.target.value.slice(0, AREA_NOTE_MAX))}
              placeholder="Area, e.g. Hatfield, near Hillcrest"
              maxLength={AREA_NOTE_MAX}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>
          <div>
            <input
              value={instagramHandle}
              onChange={(e) => setInstagramHandle(e.target.value.slice(0, INSTAGRAM_HANDLE_MAX))}
              placeholder="Instagram handle (optional)"
              maxLength={INSTAGRAM_HANDLE_MAX}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <h2 className="pt-2 text-sm font-semibold text-gray-700">What do you offer?</h2>
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

      {step === 2 && (
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
              <input
                type="number"
                value={s.durationMinutes}
                onChange={(e) => updateService(i, { durationMinutes: e.target.value })}
                placeholder="Duration in minutes (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
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

      {step === 3 && (
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

      {step === 4 && (
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

      {touchedStep && !stepValid && (
        <p className="mt-4 text-sm text-red-600">{stepErrorMessage()}</p>
      )}

      <div className="mt-8 flex gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => goToStep(step - 1)}
            className="flex-1 rounded-full border border-gray-300 py-3 font-medium"
          >
            Back
          </button>
        )}
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 rounded-full bg-brand-600 py-3 font-semibold text-white"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
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
