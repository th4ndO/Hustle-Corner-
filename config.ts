// Single source of truth for app-wide constants.
// Change APP_NAME here to rename the product everywhere.

export const APP_NAME = "CampusHustle";

export const CAMPUS_SLUG = "up-hatfield";
export const CAMPUS_NAME = "University of Pretoria - Hatfield";

// TODO: confirm the correct UP student email domain(s) with the project
// owner before Phase 3 (Auth & verification). Using a placeholder domain
// so nothing accidentally verifies as a real student until this is set.
export const ALLOWED_EMAIL_DOMAINS = ["tuks.co.za"];

// Categories live in the DB (see supabase/migrations), but launch scope
// only activates these two — everything else stays hidden until sellers
// exist for it.
export const ACTIVE_CATEGORY_SLUGS = ["hair", "nails"];

export const LIMITS = {
  maxPortfolioPhotos: 6,
  maxPhotoSizeBytes: 1 * 1024 * 1024, // ~1MB after client-side compression
  bioMaxChars: 500,
  reviewCommentMaxChars: 500,
  minServicesToOnboard: 1,
  minPhotosToOnboard: 1,
};

export const WHATSAPP_PREFILL_MESSAGE =
  "Hi! I found you on " + APP_NAME + " and I'm interested in your services.";
