// Single source of truth for app-wide constants.
// Change APP_NAME here to rename the product everywhere.

export const APP_NAME = "The Business Corner";

export const CAMPUS_SLUG = "up-hatfield";
export const CAMPUS_NAME = "University of Pretoria - Hatfield";

// Student email verification is intentionally not a feature: every signup
// is marked is_verified = true by the handle_new_user trigger
// (supabase/migrations/0005), so any account can list, review and book.

// Categories live in the DB (migration 0017 seeds them); grouping and icons
// are in lib/categoryCatalog.ts.

export const LIMITS = {
  maxPortfolioPhotos: 6,
  // Keeps each listing focused; with 30+ categories, ticking everything
  // would make browsing useless.
  maxCategories: 3,
  maxPhotoSizeBytes: 1 * 1024 * 1024, // ~1MB after client-side compression
  bioMaxChars: 500,
  reviewCommentMaxChars: 500,
  minServicesToOnboard: 1,
  minPhotosToOnboard: 1,
};

export const WHATSAPP_PREFILL_MESSAGE =
  "Hi! I found you on " + APP_NAME + " and I'm interested in your services.";
