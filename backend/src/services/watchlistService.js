import {
  WATCHLIST_STATUSES
} from "../config/riskConstants.js";

import {
  SIMULATED_WATCHLIST
} from "../data/simulatedWatchlist.js";

function createScreeningResult({
  status,
  referenceId = null,
  matchedName = null
}) {
  return {
    status,
    referenceId,
    matchedName,
    simulated: true,
    screenedAt:
      new Date()
  };
}

export function normalizeWatchlistName(
  value
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toUpperCase()
    .replace(
      /[^A-Z0-9\s]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function validateEntry(entry) {
  return (
    entry &&
    typeof entry.referenceId ===
    "string" &&
    typeof entry.fullName ===
    "string" &&
    Array.isArray(entry.aliases)
  );
}

function findMatchingEntry(
  normalizedCustomerName,
  entries
) {
  for (const entry of entries) {
    if (!validateEntry(entry)) {
      continue;
    }

    const candidateNames = [
      entry.fullName,
      ...entry.aliases
    ];

    for (
      const candidateName of
      candidateNames
    ) {
      const normalizedCandidate =
        normalizeWatchlistName(
          candidateName
        );

      if (
        normalizedCandidate &&
        normalizedCandidate ===
        normalizedCustomerName
      ) {
        return {
          entry,
          matchedName:
            candidateName
        };
      }
    }
  }

  return null;
}

export function screenSimulatedWatchlist(
  fullName,
  {
    entries =
    SIMULATED_WATCHLIST
  } = {}
) {
  const normalizedCustomerName =
    normalizeWatchlistName(
      fullName
    );

  if (!normalizedCustomerName) {
    return createScreeningResult({
      status:
        WATCHLIST_STATUSES
          .UNAVAILABLE
    });
  }

  if (!Array.isArray(entries)) {
    return createScreeningResult({
      status:
        WATCHLIST_STATUSES
          .UNAVAILABLE
    });
  }

  const match =
    findMatchingEntry(
      normalizedCustomerName,
      entries
    );

  if (!match) {
    return createScreeningResult({
      status:
        WATCHLIST_STATUSES.CLEAR
    });
  }

  return createScreeningResult({
    status:
      WATCHLIST_STATUSES.MATCH,

    referenceId:
      match.entry.referenceId,

    matchedName:
      match.matchedName
  });
}