import assert from "node:assert/strict";

import {
  RISK_FACTOR_CODES,
  RISK_LEVELS,
  RISK_RECOMMENDATIONS,
  WATCHLIST_STATUSES
} from
  "../src/config/riskConstants.js";

import {
  calculateRiskAssessment
} from
  "../src/services/riskScoringService.js";

function createLowRiskInput() {
  return {
    ocrStatus:
      "processed",

    extractedText:
      "NAME TEST CUSTOMER",

    ocrConfidence:
      95,

    verificationStatus:
      "matched",

    nameMatchScore:
      100,

    watchlistStatus:
      WATCHLIST_STATUSES.CLEAR,

    duplicateDocumentDetected:
      false
  };
}

function factorCodes(result) {
  return result.riskFactors.map(
    factor => factor.code
  );
}

try {
  const lowRiskInput =
    createLowRiskInput();

  const lowRiskInputSnapshot =
    structuredClone(
      lowRiskInput
    );

  const lowRisk =
    calculateRiskAssessment(
      lowRiskInput
    );

  assert.equal(
    lowRisk.riskScore,
    0
  );

  assert.equal(
    lowRisk.riskLevel,
    RISK_LEVELS.LOW
  );

  assert.equal(
    lowRisk.recommendation,
    RISK_RECOMMENDATIONS
      .PROCEED
  );

  assert.equal(
    lowRisk.reviewRequired,
    false
  );

  assert.equal(
    lowRisk.riskFactors.length,
    0
  );

  assert.deepEqual(
    lowRiskInput,
    lowRiskInputSnapshot
  );

  console.log(
    "Low-risk scoring and input immutability verified"
  );

  const mediumRisk =
    calculateRiskAssessment({
      ...createLowRiskInput(),

      ocrConfidence:
        70,

      verificationStatus:
        "needs_review",

      nameMatchScore:
        66.67
    });

  assert.equal(
    mediumRisk.riskScore,
    35
  );

  assert.equal(
    mediumRisk.riskLevel,
    RISK_LEVELS.MEDIUM
  );

  assert.equal(
    mediumRisk.recommendation,
    RISK_RECOMMENDATIONS
      .MANUAL_REVIEW
  );

  assert.equal(
    mediumRisk.reviewRequired,
    true
  );

  assert.deepEqual(
    factorCodes(
      mediumRisk
    ),
    [
      RISK_FACTOR_CODES
        .OCR_CONFIDENCE_LOW,

      RISK_FACTOR_CODES
        .NAME_PARTIAL_MATCH
    ]
  );

  console.log(
    "Medium-risk additive scoring verified"
  );

  const highNameMismatch =
    calculateRiskAssessment({
      ...createLowRiskInput(),

      verificationStatus:
        "needs_review",

      nameMatchScore:
        0
    });

  assert.equal(
    highNameMismatch.riskScore,
    60
  );

  assert.equal(
    highNameMismatch.riskLevel,
    RISK_LEVELS.HIGH
  );

  assert.equal(
    highNameMismatch
      .recommendation,
    RISK_RECOMMENDATIONS
      .ESCALATE
  );

  assert.deepEqual(
    factorCodes(
      highNameMismatch
    ),
    [
      RISK_FACTOR_CODES
        .NAME_NO_MATCH
    ]
  );

  console.log(
    "High-risk name-mismatch scoring verified"
  );

  const watchlistOverride =
    calculateRiskAssessment({
      ...createLowRiskInput(),

      watchlistStatus:
        WATCHLIST_STATUSES.MATCH
    });

  assert.equal(
    watchlistOverride.riskScore,
    100
  );

  assert.equal(
    watchlistOverride.riskLevel,
    RISK_LEVELS.HIGH
  );

  assert.ok(
    factorCodes(
      watchlistOverride
    ).includes(
      RISK_FACTOR_CODES
        .WATCHLIST_MATCH
    )
  );

  console.log(
    "Critical watchlist score override verified"
  );

  const ocrFailure =
    calculateRiskAssessment({
      ocrStatus:
        "failed",

      extractedText:
        null,

      ocrConfidence:
        null,

      verificationStatus:
        "failed",

      nameMatchScore:
        null,

      watchlistStatus:
        WATCHLIST_STATUSES.CLEAR,

      duplicateDocumentDetected:
        false
    });

  assert.equal(
    ocrFailure.riskScore,
    60
  );

  assert.deepEqual(
    factorCodes(
      ocrFailure
    ),
    [
      RISK_FACTOR_CODES
        .OCR_FAILED
    ]
  );

  assert.ok(
    !factorCodes(
      ocrFailure
    ).includes(
      RISK_FACTOR_CODES
        .NAME_VERIFICATION_FAILED
    )
  );

  console.log(
    "OCR failure precedence without double penalty verified"
  );

  const noText =
    calculateRiskAssessment({
      ocrStatus:
        "processed",

      extractedText:
        "   ",

      ocrConfidence:
        null,

      verificationStatus:
        "pending",

      nameMatchScore:
        null,

      watchlistStatus:
        WATCHLIST_STATUSES.CLEAR,

      duplicateDocumentDetected:
        false
    });

  assert.equal(
    noText.riskScore,
    40
  );

  assert.equal(
    noText.riskLevel,
    RISK_LEVELS.MEDIUM
  );

  assert.deepEqual(
    factorCodes(noText),
    [
      RISK_FACTOR_CODES
        .OCR_NO_TEXT
    ]
  );

  console.log(
    "Missing OCR text precedence verified"
  );

  const duplicateIdentityDocument =
    calculateRiskAssessment({
      ...createLowRiskInput(),

      duplicateDocumentDetected:
        true
    });

  assert.equal(
    duplicateIdentityDocument
      .riskScore,
    40
  );

  assert.equal(
    duplicateIdentityDocument
      .riskLevel,
    RISK_LEVELS.MEDIUM
  );

  assert.ok(
    factorCodes(
      duplicateIdentityDocument
    ).includes(
      RISK_FACTOR_CODES
        .DUPLICATE_ID_DOCUMENT
    )
  );

  console.log(
    "Duplicate identity-document risk verified"
  );

  const cappedScore =
    calculateRiskAssessment({
      ocrStatus:
        "failed",

      extractedText:
        null,

      ocrConfidence:
        null,

      verificationStatus:
        "failed",

      nameMatchScore:
        null,

      watchlistStatus:
        WATCHLIST_STATUSES
          .UNAVAILABLE,

      duplicateDocumentDetected:
        true
    });

  assert.equal(
    cappedScore.riskScore,
    100
  );

  assert.equal(
    cappedScore.riskLevel,
    RISK_LEVELS.HIGH
  );

  assert.deepEqual(
    factorCodes(
      cappedScore
    ),
    [
      RISK_FACTOR_CODES
        .OCR_FAILED,

      RISK_FACTOR_CODES
        .WATCHLIST_UNAVAILABLE,

      RISK_FACTOR_CODES
        .DUPLICATE_ID_DOCUMENT
    ]
  );

  console.log(
    "Additive score cap verified"
  );

  const unavailableWatchlist =
    calculateRiskAssessment({
      ...createLowRiskInput(),

      watchlistStatus:
        WATCHLIST_STATUSES
          .UNAVAILABLE
    });

  assert.equal(
    unavailableWatchlist
      .riskScore,
    20
  );

  assert.equal(
    unavailableWatchlist
      .riskLevel,
    RISK_LEVELS.LOW
  );

  assert.ok(
    factorCodes(
      unavailableWatchlist
    ).includes(
      RISK_FACTOR_CODES
        .WATCHLIST_UNAVAILABLE
    )
  );

  console.log(
    "Unavailable watchlist scoring verified"
  );

  assert.throws(
    () =>
      calculateRiskAssessment({
        ...createLowRiskInput(),
        ocrStatus:
          "processing"
      }),

    /OCR processing must be completed/
  );

  assert.throws(
    () =>
      calculateRiskAssessment({
        ...createLowRiskInput(),
        watchlistStatus:
          "client_match"
      }),

    /valid watchlist screening status/
  );

  assert.throws(
    () =>
      calculateRiskAssessment({
        ...createLowRiskInput(),
        duplicateDocumentDetected:
          "true"
      }),

    /must be a boolean/
  );

  assert.throws(
    () =>
      calculateRiskAssessment({
        ...createLowRiskInput(),
        ocrConfidence:
          120
      }),

    /between 0 and 100/
  );

  console.log(
    "Invalid risk-scoring inputs rejected"
  );

  console.log(
    "Sprint 4 pure risk-scoring engine verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 4 pure risk-scoring engine verification failed:",
    error
  );

  process.exitCode = 1;
}