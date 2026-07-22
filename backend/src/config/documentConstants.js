export const DOCUMENT_TYPES = Object.freeze([
  "national_id",
  "passport",
  "drivers_license",
  "voters_card",
  "utility_bill"
]);

export const DOCUMENT_MIME_TYPES =
  Object.freeze([
    "image/jpeg",
    "image/png"
  ]);

export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;

export const NAME_MATCH_THRESHOLD_PERCENT = 75;

export const MAX_DOCUMENT_PIXELS = 25_000_000;