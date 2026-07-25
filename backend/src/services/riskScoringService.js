import {
  MAX_RISK_SCORE,
  NAME_MATCH_BANDS,
  OCR_CONFIDENCE_BANDS,
  RISK_FACTOR_CODES,
  RISK_FACTOR_DEFINITIONS,
  RISK_LEVEL_OUTCOMES,
  RISK_LEVELS,
  RISK_SCORING_POLICY,
  RISK_THRESHOLDS,
  WATCHLIST_STATUSES
} from "../config/riskConstants.js";

const FINAL_OCR_STATUSES =
  new Set([
    "processed",
    "failed"
  ]);

const FINAL_VERIFICATION_STATUSES =
  new Set([
    "matched",
    "needs_review",
    "failed"
  ]);

function createValidationError(
  message
) {
  const error =
    new Error(message);

  error.statusCode = 400;

  return error;
}

function normalizeObservedValue(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return String(value);
}

function createRiskFactor(
  code,
  observedValue = null
) {
  const definition =
    RISK_FACTOR_DEFINITIONS[
    code
    ];

  if (!definition) {
    throw createValidationError(
      `Unknown risk-factor code: ${code}`
    );
  }

  return {
    code,

    category:
      definition.category,

    description:
      definition.description,

    scoreImpact:
      definition.scoreImpact,

    observedValue:
      normalizeObservedValue(
        observedValue
      ),

    severity:
      definition.severity,

    isOverride:
      definition.isOverride
  };
}

function addMaterialFactor(
  factors,
  code,
  observedValue = null
) {
  const factor =
    createRiskFactor(
      code,
      observedValue
    );

  /*
   * Zero-point clear conditions are defined
   * in the central configuration but do not
   * need to be persisted as triggered risks.
   */
  if (
    factor.scoreImpact > 0 ||
    factor.isOverride
  ) {
    factors.push(factor);
  }
}

function hasUsableExtractedText(
  extractedText
) {
  return (
    typeof extractedText ===
    "string" &&
    extractedText.trim().length > 0
  );
}

function validatePercentage(
  value,
  fieldName
) {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    throw createValidationError(
      `${fieldName} must be a number between 0 and 100`
    );
  }
}

function evaluateOcrAndNameFactors({
  factors,
  ocrStatus,
  extractedText,
  ocrConfidence,
  verificationStatus,
  nameMatchScore
}) {
  if (
    !FINAL_OCR_STATUSES.has(
      ocrStatus
    )
  ) {
    throw createValidationError(
      "OCR processing must be completed before risk scoring"
    );
  }

  if (ocrStatus === "failed") {
    addMaterialFactor(
      factors,
      RISK_FACTOR_CODES
        .OCR_FAILED,
      ocrStatus
    );

    /*
     * Name verification depends on OCR output.
     * Do not add a second name failure penalty.
     */
    return;
  }

  const extractedTextPresent =
    hasUsableExtractedText(
      extractedText
    );

  if (!extractedTextPresent) {
    addMaterialFactor(
      factors,
      RISK_FACTOR_CODES
        .OCR_NO_TEXT,
      "No usable OCR text"
    );

    /*
     * There is no reliable text against which
     * the customer name can be compared.
     */
    return;
  }

  validatePercentage(
    ocrConfidence,
    "OCR confidence"
  );

  if (
    ocrConfidence <
    OCR_CONFIDENCE_BANDS
      .VERY_LOW_BELOW
  ) {
    addMaterialFactor(
      factors,
      RISK_FACTOR_CODES
        .OCR_CONFIDENCE_VERY_LOW,
      ocrConfidence
    );
  } else if (
    ocrConfidence <
    OCR_CONFIDENCE_BANDS
      .LOW_BELOW
  ) {
    addMaterialFactor(
      factors,
      RISK_FACTOR_CODES
        .OCR_CONFIDENCE_LOW,
      ocrConfidence
    );
  } else if (
    ocrConfidence <
    OCR_CONFIDENCE_BANDS
      .MODERATE_BELOW
  ) {
    addMaterialFactor(
      factors,
      RISK_FACTOR_CODES
        .OCR_CONFIDENCE_MODERATE,
      ocrConfidence
    );
  }

  if (
    !FINAL_VERIFICATION_STATUSES
      .has(verificationStatus)
  ) {
    throw createValidationError(
      "Name verification must be completed before risk scoring"
    );
  }

  if (
    verificationStatus ===
    "failed"
  ) {
    addMaterialFactor(
      factors,
      RISK_FACTOR_CODES
        .NAME_VERIFICATION_FAILED,
      verificationStatus
    );

    return;
  }

  validatePercentage(
    nameMatchScore,
    "Name-match score"
  );

  if (
    nameMatchScore ===
    NAME_MATCH_BANDS.NO_MATCH
  ) {
    addMaterialFactor(
      factors,
      RISK_FACTOR_CODES
        .NAME_NO_MATCH,
      nameMatchScore
    );
  } else if (
    nameMatchScore <
    NAME_MATCH_BANDS
      .WEAK_BELOW
  ) {
    addMaterialFactor(
      factors,
      RISK_FACTOR_CODES
        .NAME_WEAK_MATCH,
      nameMatchScore
    );
  } else if (
    nameMatchScore <
    NAME_MATCH_BANDS
      .MATCHED_FROM
  ) {
    addMaterialFactor(
      factors,
      RISK_FACTOR_CODES
        .NAME_PARTIAL_MATCH,
      nameMatchScore
    );
  }
}

function evaluateWatchlistFactor({
  factors,
  watchlistStatus
}) {
  const allowedStatuses =
    Object.values(
      WATCHLIST_STATUSES
    );

  if (
    !allowedStatuses.includes(
      watchlistStatus
    )
  ) {
    throw createValidationError(
      "A valid watchlist screening status is required"
    );
  }

  if (
    watchlistStatus ===
    WATCHLIST_STATUSES.MATCH
  ) {
    addMaterialFactor(
      factors,
      RISK_FACTOR_CODES
        .WATCHLIST_MATCH,
      watchlistStatus
    );

    return;
  }

  if (
    watchlistStatus ===
    WATCHLIST_STATUSES
      .UNAVAILABLE
  ) {
    addMaterialFactor(
      factors,
      RISK_FACTOR_CODES
        .WATCHLIST_UNAVAILABLE,
      watchlistStatus
    );
  }
}

function evaluateDuplicateDocumentFactor({
  factors,
  duplicateDocumentDetected
}) {
  if (
    typeof duplicateDocumentDetected !==
    "boolean"
  ) {
    throw createValidationError(
      "Duplicate-document detection must be a boolean value"
    );
  }

  if (duplicateDocumentDetected) {
    addMaterialFactor(
      factors,
      RISK_FACTOR_CODES
        .DUPLICATE_ID_DOCUMENT,
      true
    );
  }
}

function calculateFinalScore(
  factors
) {
  const overrideFactor =
    factors.find(
      factor =>
        factor.isOverride
    );

  if (
    overrideFactor &&
    RISK_SCORING_POLICY
      .watchlistMatchOverridesScore
  ) {
    return MAX_RISK_SCORE;
  }

  const additiveScore =
    factors.reduce(
      (
        total,
        factor
      ) =>
        total +
        factor.scoreImpact,
      0
    );

  return Math.min(
    additiveScore,
    RISK_SCORING_POLICY
      .maximumScore
  );
}

function determineRiskLevel(
  riskScore
) {
  if (
    riskScore <=
    RISK_THRESHOLDS[
      RISK_LEVELS.LOW
    ].max
  ) {
    return RISK_LEVELS.LOW;
  }

  if (
    riskScore <=
    RISK_THRESHOLDS[
      RISK_LEVELS.MEDIUM
    ].max
  ) {
    return RISK_LEVELS.MEDIUM;
  }

  return RISK_LEVELS.HIGH;
}

function createAssessmentReasons(
  factors
) {
  if (factors.length === 0) {
    return [
      "No material KYC risk factors were detected"
    ];
  }

  return factors.map(
    factor =>
      factor.description
  );
}

export function calculateRiskAssessment(
  assessmentInput
) {
  if (
    !assessmentInput ||
    typeof assessmentInput !==
    "object" ||
    Array.isArray(
      assessmentInput
    )
  ) {
    throw createValidationError(
      "A valid risk-assessment input object is required"
    );
  }

  const {
    ocrStatus,
    extractedText,
    ocrConfidence,
    verificationStatus,
    nameMatchScore,
    watchlistStatus,
    duplicateDocumentDetected
  } = assessmentInput;

  const riskFactors = [];

  evaluateOcrAndNameFactors({
    factors:
      riskFactors,

    ocrStatus,
    extractedText,
    ocrConfidence,
    verificationStatus,
    nameMatchScore
  });

  evaluateWatchlistFactor({
    factors:
      riskFactors,

    watchlistStatus
  });

  evaluateDuplicateDocumentFactor({
    factors:
      riskFactors,

    duplicateDocumentDetected
  });

  const riskScore =
    calculateFinalScore(
      riskFactors
    );

  const riskLevel =
    determineRiskLevel(
      riskScore
    );

  const outcome =
    RISK_LEVEL_OUTCOMES[
    riskLevel
    ];

  return {
    riskScore,
    riskLevel,

    recommendation:
      outcome.recommendation,

    reviewRequired:
      outcome.reviewRequired,

    riskFactors,

    assessmentReasons:
      createAssessmentReasons(
        riskFactors
      )
  };
}