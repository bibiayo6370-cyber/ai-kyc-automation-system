import assert from "node:assert/strict";

import {
  ASSESSMENT_STATUSES,
  DUPLICATE_IDENTITY_DOCUMENT_TYPES,
  EXCLUDED_DUPLICATE_DOCUMENT_TYPES,
  MAX_RISK_SCORE,
  MIN_RISK_SCORE,
  NAME_MATCH_BANDS,
  OCR_CONFIDENCE_BANDS,
  RISK_FACTOR_CODES,
  RISK_FACTOR_DEFINITIONS,
  RISK_LEVEL_OUTCOMES,
  RISK_LEVELS,
  RISK_RECOMMENDATIONS,
  RISK_RULES_VERSION,
  RISK_SCORING_POLICY,
  RISK_THRESHOLDS,
  WATCHLIST_STATUSES
} from
  "../src/config/riskConstants.js";

try {
  assert.equal(
    RISK_RULES_VERSION,
    "1.0"
  );

  assert.equal(
    MIN_RISK_SCORE,
    0
  );

  assert.equal(
    MAX_RISK_SCORE,
    100
  );

  console.log(
    "Risk rules version and score boundaries verified"
  );

  assert.deepEqual(
    Object.values(
      ASSESSMENT_STATUSES
    ),
    [
      "pending",
      "completed",
      "failed"
    ]
  );

  assert.deepEqual(
    Object.values(RISK_LEVELS),
    [
      "low",
      "medium",
      "high"
    ]
  );

  assert.deepEqual(
    Object.values(
      WATCHLIST_STATUSES
    ),
    [
      "clear",
      "match",
      "unavailable"
    ]
  );

  console.log(
    "Assessment, risk-level and watchlist enums verified"
  );

  const low =
    RISK_THRESHOLDS[
    RISK_LEVELS.LOW
    ];

  const medium =
    RISK_THRESHOLDS[
    RISK_LEVELS.MEDIUM
    ];

  const high =
    RISK_THRESHOLDS[
    RISK_LEVELS.HIGH
    ];

  assert.deepEqual(
    low,
    {
      min: 0,
      max: 29
    }
  );

  assert.deepEqual(
    medium,
    {
      min: 30,
      max: 59
    }
  );

  assert.deepEqual(
    high,
    {
      min: 60,
      max: 100
    }
  );

  assert.equal(
    low.max + 1,
    medium.min
  );

  assert.equal(
    medium.max + 1,
    high.min
  );

  assert.equal(
    high.max,
    MAX_RISK_SCORE
  );

  console.log(
    "Low, medium and high risk thresholds verified"
  );

  assert.deepEqual(
    RISK_LEVEL_OUTCOMES[
    RISK_LEVELS.LOW
    ],
    {
      recommendation:
        RISK_RECOMMENDATIONS.PROCEED,

      reviewRequired: false
    }
  );

  assert.deepEqual(
    RISK_LEVEL_OUTCOMES[
    RISK_LEVELS.MEDIUM
    ],
    {
      recommendation:
        RISK_RECOMMENDATIONS
          .MANUAL_REVIEW,

      reviewRequired: true
    }
  );

  assert.deepEqual(
    RISK_LEVEL_OUTCOMES[
    RISK_LEVELS.HIGH
    ],
    {
      recommendation:
        RISK_RECOMMENDATIONS
          .ESCALATE,

      reviewRequired: true
    }
  );

  console.log(
    "Risk recommendations and review requirements verified"
  );

  assert.deepEqual(
    OCR_CONFIDENCE_BANDS,
    {
      VERY_LOW_BELOW: 50,
      LOW_BELOW: 75,
      MODERATE_BELOW: 85
    }
  );

  assert.deepEqual(
    NAME_MATCH_BANDS,
    {
      NO_MATCH: 0,
      WEAK_BELOW: 50,
      MATCHED_FROM: 75
    }
  );

  console.log(
    "OCR confidence and name-match bands verified"
  );

  assert.deepEqual(
    DUPLICATE_IDENTITY_DOCUMENT_TYPES,
    [
      "national_id",
      "passport",
      "drivers_license",
      "voters_card"
    ]
  );

  assert.ok(
    !DUPLICATE_IDENTITY_DOCUMENT_TYPES
      .includes("utility_bill")
  );

  assert.deepEqual(
    EXCLUDED_DUPLICATE_DOCUMENT_TYPES,
    [
      "utility_bill"
    ]
  );

  console.log(
    "Duplicate identity-document rules verified"
  );

  const factorCodes =
    Object.values(
      RISK_FACTOR_CODES
    ).sort();

  const definitionCodes =
    Object.keys(
      RISK_FACTOR_DEFINITIONS
    ).sort();

  assert.deepEqual(
    definitionCodes,
    factorCodes
  );

  for (
    const definition of
    Object.values(
      RISK_FACTOR_DEFINITIONS
    )
  ) {
    assert.ok(
      Number.isFinite(
        definition.scoreImpact
      )
    );

    assert.ok(
      definition.scoreImpact >=
      MIN_RISK_SCORE
    );

    assert.ok(
      definition.scoreImpact <=
      MAX_RISK_SCORE
    );

    assert.equal(
      typeof definition.description,
      "string"
    );

    assert.ok(
      definition.description.length > 0
    );
  }

  console.log(
    "All risk-factor definitions and weights verified"
  );

  const watchlistMatch =
    RISK_FACTOR_DEFINITIONS[
    RISK_FACTOR_CODES
      .WATCHLIST_MATCH
    ];

  assert.equal(
    watchlistMatch.scoreImpact,
    100
  );

  assert.equal(
    watchlistMatch.isOverride,
    true
  );

  assert.equal(
    RISK_FACTOR_DEFINITIONS[
      RISK_FACTOR_CODES.OCR_FAILED
    ].scoreImpact,
    60
  );

  assert.equal(
    RISK_FACTOR_DEFINITIONS[
      RISK_FACTOR_CODES
        .NAME_VERIFICATION_FAILED
    ].scoreImpact,
    60
  );

  assert.equal(
    RISK_FACTOR_DEFINITIONS[
      RISK_FACTOR_CODES
        .NAME_NO_MATCH
    ].scoreImpact,
    60
  );

  assert.equal(
    RISK_FACTOR_DEFINITIONS[
      RISK_FACTOR_CODES
        .DUPLICATE_ID_DOCUMENT
    ].scoreImpact,
    40
  );

  console.log(
    "Approved high-risk and duplicate-document weights verified"
  );

  assert.equal(
    RISK_SCORING_POLICY
      .watchlistMatchOverridesScore,
    true
  );

  assert.equal(
    RISK_SCORING_POLICY
      .skipNameFactorsWhenOcrFailed,
    true
  );

  assert.equal(
    RISK_SCORING_POLICY
      .skipNameFactorsWhenOcrTextMissing,
    true
  );

  assert.equal(
    RISK_SCORING_POLICY.maximumScore,
    100
  );

  console.log(
    "Risk scoring precedence and score cap verified"
  );

  const prohibitedTerms = [
    "GENDER",
    "NATIONALITY",
    "AGE",
    "OCCUPATION",
    "ETHNICITY",
    "LOCATION",
    "RESIDENTIAL"
  ];

  for (const code of factorCodes) {
    for (
      const prohibitedTerm of
      prohibitedTerms
    ) {
      assert.ok(
        !code.includes(
          prohibitedTerm
        ),
        `Prohibited risk attribute detected: ${code}`
      );
    }
  }

  console.log(
    "Non-discriminatory risk-factor policy verified"
  );

  console.log(
    "Sprint 4 risk constants verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 4 risk constants verification failed:",
    error
  );

  process.exitCode = 1;
}