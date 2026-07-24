export const RISK_RULES_VERSION =
  "1.0";

export const MIN_RISK_SCORE = 0;
export const MAX_RISK_SCORE = 100;

export const ASSESSMENT_STATUSES =
  Object.freeze({
    PENDING: "pending",
    COMPLETED: "completed",
    FAILED: "failed"
  });

export const RISK_LEVELS =
  Object.freeze({
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high"
  });

export const RISK_RECOMMENDATIONS =
  Object.freeze({
    PROCEED: "proceed",
    MANUAL_REVIEW: "manual_review",
    ESCALATE: "escalate"
  });

export const WATCHLIST_STATUSES =
  Object.freeze({
    CLEAR: "clear",
    MATCH: "match",
    UNAVAILABLE: "unavailable"
  });

export const RISK_FACTOR_CATEGORIES =
  Object.freeze({
    DOCUMENT_QUALITY:
      "document_quality",

    IDENTITY_MATCH:
      "identity_match",

    WATCHLIST:
      "watchlist",

    DOCUMENT_INTEGRITY:
      "document_integrity",

    SYSTEM:
      "system"
  });

export const RISK_FACTOR_SEVERITIES =
  Object.freeze({
    INFO: "info",
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    CRITICAL: "critical"
  });

export const RISK_THRESHOLDS =
  Object.freeze({
    [RISK_LEVELS.LOW]:
      Object.freeze({
        min: 0,
        max: 29
      }),

    [RISK_LEVELS.MEDIUM]:
      Object.freeze({
        min: 30,
        max: 59
      }),

    [RISK_LEVELS.HIGH]:
      Object.freeze({
        min: 60,
        max: 100
      })
  });

export const RISK_LEVEL_OUTCOMES =
  Object.freeze({
    [RISK_LEVELS.LOW]:
      Object.freeze({
        recommendation:
          RISK_RECOMMENDATIONS.PROCEED,

        reviewRequired: false
      }),

    [RISK_LEVELS.MEDIUM]:
      Object.freeze({
        recommendation:
          RISK_RECOMMENDATIONS
            .MANUAL_REVIEW,

        reviewRequired: true
      }),

    [RISK_LEVELS.HIGH]:
      Object.freeze({
        recommendation:
          RISK_RECOMMENDATIONS.ESCALATE,

        reviewRequired: true
      })
  });

export const OCR_CONFIDENCE_BANDS =
  Object.freeze({
    VERY_LOW_BELOW: 50,
    LOW_BELOW: 75,
    MODERATE_BELOW: 85
  });

export const NAME_MATCH_BANDS =
  Object.freeze({
    NO_MATCH: 0,
    WEAK_BELOW: 50,
    MATCHED_FROM: 75
  });

export const DUPLICATE_IDENTITY_DOCUMENT_TYPES =
  Object.freeze([
    "national_id",
    "passport",
    "drivers_license",
    "voters_card"
  ]);

export const EXCLUDED_DUPLICATE_DOCUMENT_TYPES =
  Object.freeze([
    "utility_bill"
  ]);

export const RISK_SCORING_POLICY =
  Object.freeze({
    watchlistMatchOverridesScore:
      true,

    skipNameFactorsWhenOcrFailed:
      true,

    skipNameFactorsWhenOcrTextMissing:
      true,

    maximumScore:
      MAX_RISK_SCORE
  });

export const RISK_FACTOR_CODES =
  Object.freeze({
    WATCHLIST_MATCH:
      "WATCHLIST_MATCH",

    WATCHLIST_UNAVAILABLE:
      "WATCHLIST_UNAVAILABLE",

    WATCHLIST_CLEAR:
      "WATCHLIST_CLEAR",

    OCR_FAILED:
      "OCR_FAILED",

    OCR_NO_TEXT:
      "OCR_NO_TEXT",

    OCR_CONFIDENCE_VERY_LOW:
      "OCR_CONFIDENCE_VERY_LOW",

    OCR_CONFIDENCE_LOW:
      "OCR_CONFIDENCE_LOW",

    OCR_CONFIDENCE_MODERATE:
      "OCR_CONFIDENCE_MODERATE",

    OCR_CONFIDENCE_HIGH:
      "OCR_CONFIDENCE_HIGH",

    NAME_VERIFICATION_FAILED:
      "NAME_VERIFICATION_FAILED",

    NAME_NO_MATCH:
      "NAME_NO_MATCH",

    NAME_WEAK_MATCH:
      "NAME_WEAK_MATCH",

    NAME_PARTIAL_MATCH:
      "NAME_PARTIAL_MATCH",

    NAME_MATCHED:
      "NAME_MATCHED",

    DUPLICATE_ID_DOCUMENT:
      "DUPLICATE_ID_DOCUMENT",

    UNIQUE_DOCUMENT:
      "UNIQUE_DOCUMENT"
  });

const {
  DOCUMENT_QUALITY,
  IDENTITY_MATCH,
  WATCHLIST,
  DOCUMENT_INTEGRITY
} = RISK_FACTOR_CATEGORIES;

const {
  INFO,
  LOW,
  MEDIUM,
  HIGH,
  CRITICAL
} = RISK_FACTOR_SEVERITIES;

export const RISK_FACTOR_DEFINITIONS =
  Object.freeze({
    [RISK_FACTOR_CODES.WATCHLIST_MATCH]:
      Object.freeze({
        category: WATCHLIST,

        description:
          "The customer name matched a fictional simulated watchlist entry",

        scoreImpact: 100,

        severity: CRITICAL,

        isOverride: true
      }),

    [RISK_FACTOR_CODES
      .WATCHLIST_UNAVAILABLE]:
      Object.freeze({
        category: WATCHLIST,

        description:
          "Simulated watchlist screening could not be completed",

        scoreImpact: 20,

        severity: MEDIUM,

        isOverride: false
      }),

    [RISK_FACTOR_CODES.WATCHLIST_CLEAR]:
      Object.freeze({
        category: WATCHLIST,

        description:
          "No simulated watchlist match was found",

        scoreImpact: 0,

        severity: INFO,

        isOverride: false
      }),

    [RISK_FACTOR_CODES.OCR_FAILED]:
      Object.freeze({
        category: DOCUMENT_QUALITY,

        description:
          "The identity document could not be processed automatically",

        scoreImpact: 60,

        severity: HIGH,

        isOverride: false
      }),

    [RISK_FACTOR_CODES.OCR_NO_TEXT]:
      Object.freeze({
        category: DOCUMENT_QUALITY,

        description:
          "OCR completed but returned no usable text",

        scoreImpact: 40,

        severity: HIGH,

        isOverride: false
      }),

    [RISK_FACTOR_CODES
      .OCR_CONFIDENCE_VERY_LOW]:
      Object.freeze({
        category: DOCUMENT_QUALITY,

        description:
          "OCR confidence was below 50 percent",

        scoreImpact: 30,

        severity: HIGH,

        isOverride: false
      }),

    [RISK_FACTOR_CODES
      .OCR_CONFIDENCE_LOW]:
      Object.freeze({
        category: DOCUMENT_QUALITY,

        description:
          "OCR confidence was between 50 and 74.99 percent",

        scoreImpact: 15,

        severity: MEDIUM,

        isOverride: false
      }),

    [RISK_FACTOR_CODES
      .OCR_CONFIDENCE_MODERATE]:
      Object.freeze({
        category: DOCUMENT_QUALITY,

        description:
          "OCR confidence was between 75 and 84.99 percent",

        scoreImpact: 5,

        severity: LOW,

        isOverride: false
      }),

    [RISK_FACTOR_CODES
      .OCR_CONFIDENCE_HIGH]:
      Object.freeze({
        category: DOCUMENT_QUALITY,

        description:
          "OCR confidence was 85 percent or above",

        scoreImpact: 0,

        severity: INFO,

        isOverride: false
      }),

    [RISK_FACTOR_CODES
      .NAME_VERIFICATION_FAILED]:
      Object.freeze({
        category: IDENTITY_MATCH,

        description:
          "Customer-name verification could not be completed",

        scoreImpact: 60,

        severity: HIGH,

        isOverride: false
      }),

    [RISK_FACTOR_CODES.NAME_NO_MATCH]:
      Object.freeze({
        category: IDENTITY_MATCH,

        description:
          "The submitted customer name was not found in the extracted document text",

        scoreImpact: 60,

        severity: HIGH,

        isOverride: false
      }),

    [RISK_FACTOR_CODES.NAME_WEAK_MATCH]:
      Object.freeze({
        category: IDENTITY_MATCH,

        description:
          "Only a weak customer-name match was found in the document",

        scoreImpact: 35,

        severity: HIGH,

        isOverride: false
      }),

    [RISK_FACTOR_CODES
      .NAME_PARTIAL_MATCH]:
      Object.freeze({
        category: IDENTITY_MATCH,

        description:
          "The customer name was only partially matched in the document",

        scoreImpact: 20,

        severity: MEDIUM,

        isOverride: false
      }),

    [RISK_FACTOR_CODES.NAME_MATCHED]:
      Object.freeze({
        category: IDENTITY_MATCH,

        description:
          "The customer name matched the extracted document text",

        scoreImpact: 0,

        severity: INFO,

        isOverride: false
      }),

    [RISK_FACTOR_CODES
      .DUPLICATE_ID_DOCUMENT]:
      Object.freeze({
        category: DOCUMENT_INTEGRITY,

        description:
          "The same identity-document content was previously associated with another customer",

        scoreImpact: 40,

        severity: HIGH,

        isOverride: false
      }),

    [RISK_FACTOR_CODES.UNIQUE_DOCUMENT]:
      Object.freeze({
        category: DOCUMENT_INTEGRITY,

        description:
          "No cross-customer duplicate identity document was detected",

        scoreImpact: 0,

        severity: INFO,

        isOverride: false
      })
  });