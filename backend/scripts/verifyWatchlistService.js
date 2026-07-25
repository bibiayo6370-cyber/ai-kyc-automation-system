import assert from "node:assert/strict";

import {
  WATCHLIST_STATUSES
} from
  "../src/config/riskConstants.js";

import {
  SIMULATED_WATCHLIST
} from
  "../src/data/simulatedWatchlist.js";

import {
  normalizeWatchlistName,
  screenSimulatedWatchlist
} from
  "../src/services/watchlistService.js";

try {
  assert.ok(
    Array.isArray(
      SIMULATED_WATCHLIST
    )
  );

  assert.ok(
    SIMULATED_WATCHLIST.length >= 3
  );

  for (
    const entry of
    SIMULATED_WATCHLIST
  ) {
    assert.match(
      entry.referenceId,
      /^SIM-WL-\d{3}$/
    );

    assert.equal(
      entry.category,
      "simulated_watchlist"
    );

    assert.ok(
      entry.fullName
        .toUpperCase()
        .includes("TEST") ||
      entry.fullName
        .toUpperCase()
        .includes("DEMO")
    );

    assert.equal(
      Object.isFrozen(entry),
      true
    );

    assert.equal(
      Object.isFrozen(
        entry.aliases
      ),
      true
    );
  }

  console.log(
    "Fictional simulated watchlist dataset verified"
  );

  assert.equal(
    normalizeWatchlistName(
      "  High-Risk   Test Person "
    ),
    "HIGH RISK TEST PERSON"
  );

  assert.equal(
    normalizeWatchlistName(
      "José Test Customer"
    ),
    "JOSE TEST CUSTOMER"
  );

  assert.equal(
    normalizeWatchlistName(null),
    ""
  );

  console.log(
    "Watchlist name normalization verified"
  );

  const exactMatch =
    screenSimulatedWatchlist(
      "Sanctioned Test Customer"
    );

  assert.equal(
    exactMatch.status,
    WATCHLIST_STATUSES.MATCH
  );

  assert.equal(
    exactMatch.referenceId,
    "SIM-WL-001"
  );

  assert.equal(
    exactMatch.matchedName,
    "Sanctioned Test Customer"
  );

  assert.equal(
    exactMatch.simulated,
    true
  );

  assert.ok(
    exactMatch.screenedAt
    instanceof Date
  );

  console.log(
    "Exact simulated watchlist match verified"
  );

  const aliasMatch =
    screenSimulatedWatchlist(
      "Demo Blocked Applicant"
    );

  assert.equal(
    aliasMatch.status,
    WATCHLIST_STATUSES.MATCH
  );

  assert.equal(
    aliasMatch.referenceId,
    "SIM-WL-002"
  );

  assert.equal(
    aliasMatch.matchedName,
    "Demo Blocked Applicant"
  );

  console.log(
    "Simulated watchlist alias match verified"
  );

  const normalizedMatch =
    screenSimulatedWatchlist(
      "  high-risk   test person "
    );

  assert.equal(
    normalizedMatch.status,
    WATCHLIST_STATUSES.MATCH
  );

  assert.equal(
    normalizedMatch.referenceId,
    "SIM-WL-003"
  );

  console.log(
    "Case, punctuation and whitespace normalization verified"
  );

  const clearResult =
    screenSimulatedWatchlist(
      "Legitimate Test Customer"
    );

  assert.equal(
    clearResult.status,
    WATCHLIST_STATUSES.CLEAR
  );

  assert.equal(
    clearResult.referenceId,
    null
  );

  assert.equal(
    clearResult.matchedName,
    null
  );

  console.log(
    "Clear watchlist screening result verified"
  );

  const partialName =
    screenSimulatedWatchlist(
      "Sanctioned Test"
    );

  assert.equal(
    partialName.status,
    WATCHLIST_STATUSES.CLEAR
  );

  console.log(
    "Partial and fuzzy watchlist matching correctly excluded"
  );

  const unavailableName =
    screenSimulatedWatchlist(
      ""
    );

  assert.equal(
    unavailableName.status,
    WATCHLIST_STATUSES
      .UNAVAILABLE
  );

  assert.equal(
    unavailableName.referenceId,
    null
  );

  console.log(
    "Missing-name unavailable result verified"
  );

  const unavailableDataset =
    screenSimulatedWatchlist(
      "Test Customer",
      {
        entries: null
      }
    );

  assert.equal(
    unavailableDataset.status,
    WATCHLIST_STATUSES
      .UNAVAILABLE
  );

  console.log(
    "Unavailable watchlist dataset result verified"
  );

  const malformedEntries =
    screenSimulatedWatchlist(
      "Sanctioned Test Customer",
      {
        entries: [
          null,
          {},
          {
            referenceId:
              "INVALID"
          }
        ]
      }
    );

  assert.equal(
    malformedEntries.status,
    WATCHLIST_STATUSES.CLEAR
  );

  console.log(
    "Malformed watchlist entries handled safely"
  );

  const clientControlledObject =
    screenSimulatedWatchlist({
      fullName:
        "Sanctioned Test Customer",

      status:
        WATCHLIST_STATUSES.MATCH
    });

  assert.equal(
    clientControlledObject.status,
    WATCHLIST_STATUSES
      .UNAVAILABLE
  );

  console.log(
    "Client-controlled watchlist objects rejected"
  );

  console.log(
    "Sprint 4 simulated watchlist verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 4 simulated watchlist verification failed:",
    error
  );

  process.exitCode = 1;
}