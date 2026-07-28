export const DOCUMENT_TYPE_OPTIONS = [
  { value: "national_id", label: "National ID" },
  { value: "passport", label: "International Passport" },
  { value: "drivers_license", label: "Driver's Licence" },
  { value: "voters_card", label: "Voter's Card" },
  { value: "utility_bill", label: "Utility Bill" }
];

export const DOCUMENT_ACCEPTED_TYPES = ["image/jpeg", "image/png"];
export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;