import {
  NAME_MATCH_THRESHOLD_PERCENT
} from "../config/documentConstants.js";

const NAME_TITLE_TOKENS = new Set([
  "MR",
  "MRS",
  "MISS",
  "MS",
  "DR",
  "PROF",
  "CHIEF",
  "ALHAJI",
  "ALHAJA"
]);

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTokens(value) {
  const normalizedValue =
    normalizeText(value);

  if (!normalizedValue) {
    return [];
  }

  return normalizedValue
    .split(" ")
    .filter(
      (token) =>
        token.length >= 2 &&
        !NAME_TITLE_TOKENS.has(token)
    );
}

function getUniqueTokens(value) {
  return [
    ...new Set(
      getTokens(value)
    )
  ];
}

function roundScore(value) {
  return Number(
    value.toFixed(2)
  );
}

export function verifyNameInOcrText(
  fullName,
  extractedText
) {
  const nameTokens =
    getUniqueTokens(fullName);

  if (nameTokens.length === 0) {
    throw new Error(
      "A valid customer name is required for OCR verification"
    );
  }

  const ocrTokenSet =
    new Set(
      getTokens(extractedText)
    );

  const matchedTokens =
    nameTokens.filter(
      (token) =>
        ocrTokenSet.has(token)
    );

  const missingTokens =
    nameTokens.filter(
      (token) =>
        !ocrTokenSet.has(token)
    );

  const nameMatchScore =
    roundScore(
      (
        matchedTokens.length /
        nameTokens.length
      ) * 100
    );

  const minimumMatchedTokens =
    nameTokens.length === 1
      ? 1
      : Math.max(
        2,
        Math.ceil(
          nameTokens.length *
          (
            NAME_MATCH_THRESHOLD_PERCENT /
            100
          )
        )
      );

  const verificationStatus =
    nameMatchScore >=
      NAME_MATCH_THRESHOLD_PERCENT &&
      matchedTokens.length >=
      minimumMatchedTokens
      ? "matched"
      : "needs_review";

  return {
    verificationStatus,
    nameMatchScore,
    matchedTokens,
    missingTokens
  };
}