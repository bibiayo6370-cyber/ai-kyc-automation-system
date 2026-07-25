import mongoose from "mongoose";

import {
  DOCUMENT_TYPES
} from "../config/documentConstants.js";

import {
  ASSESSMENT_STATUSES,
  MAX_RISK_SCORE,
  MIN_RISK_SCORE,
  RISK_FACTOR_CATEGORIES,
  RISK_FACTOR_CODES,
  RISK_FACTOR_SEVERITIES,
  RISK_LEVEL_OUTCOMES,
  RISK_LEVELS,
  RISK_RECOMMENDATIONS,
  RISK_RULES_VERSION,
  RISK_THRESHOLDS,
  WATCHLIST_STATUSES
} from "../config/riskConstants.js";

const { Schema } = mongoose;

const riskFactorSchema =
  new Schema(
    {
      code: {
        type: String,
        required: true,
        enum: Object.values(
          RISK_FACTOR_CODES
        ),
        trim: true
      },

      category: {
        type: String,
        required: true,
        enum: Object.values(
          RISK_FACTOR_CATEGORIES
        ),
        trim: true
      },

      description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
      },

      scoreImpact: {
        type: Number,
        required: true,
        min: MIN_RISK_SCORE,
        max: MAX_RISK_SCORE
      },

      observedValue: {
        type: String,
        default: null,
        trim: true,
        maxlength: 500
      },

      severity: {
        type: String,
        required: true,
        enum: Object.values(
          RISK_FACTOR_SEVERITIES
        ),
        trim: true
      },

      isOverride: {
        type: Boolean,
        default: false
      }
    },
    {
      _id: false
    }
  );

const watchlistScreeningSchema =
  new Schema(
    {
      status: {
        type: String,
        required: true,
        enum: Object.values(
          WATCHLIST_STATUSES
        ),
        default:
          WATCHLIST_STATUSES.UNAVAILABLE
      },

      referenceId: {
        type: String,
        default: null,
        trim: true,
        maxlength: 100
      },

      matchedName: {
        type: String,
        default: null,
        trim: true,
        maxlength: 250
      },

      simulated: {
        type: Boolean,
        required: true,
        default: true,
        immutable: true
      },

      screenedAt: {
        type: Date,
        default: null
      }
    },
    {
      _id: false
    }
  );

const inputSnapshotSchema =
  new Schema(
    {
      documentType: {
        type: String,
        required: true,
        enum: DOCUMENT_TYPES
      },

      ocrStatus: {
        type: String,
        required: true,
        trim: true
      },

      extractedTextPresent: {
        type: Boolean,
        required: true
      },

      ocrConfidence: {
        type: Number,
        default: null,
        min: 0,
        max: 100
      },

      verificationStatus: {
        type: String,
        required: true,
        trim: true
      },

      nameMatchScore: {
        type: Number,
        default: null,
        min: 0,
        max: 100
      },

      duplicateDocumentDetected: {
        type: Boolean,
        required: true,
        default: false
      }
    },
    {
      _id: false
    }
  );

const riskAssessmentSchema =
  new Schema(
    {
      applicationId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "KYCApplication",

        required: true,
        unique: true,
        immutable: true
      },

      userId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required: true,
        immutable: true,
        index: true
      },

      documentId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "KYCDocument",

        required: true,
        immutable: true,
        index: true
      },

      assessmentStatus: {
        type: String,

        enum:
          Object.values(
            ASSESSMENT_STATUSES
          ),

        required: true,

        default:
          ASSESSMENT_STATUSES.PENDING,

        index: true
      },

      riskScore: {
        type: Number,
        default: null,
        min: MIN_RISK_SCORE,
        max: MAX_RISK_SCORE
      },

      riskLevel: {
        type: String,

        enum:
          Object.values(
            RISK_LEVELS
          ),

        default: null,
        index: true
      },

      recommendation: {
        type: String,

        enum:
          Object.values(
            RISK_RECOMMENDATIONS
          ),

        default: null
      },

      reviewRequired: {
        type: Boolean,
        default: null
      },

      riskFactors: {
        type: [riskFactorSchema],
        default: []
      },

      assessmentReasons: {
        type: [
          {
            type: String,
            trim: true,
            maxlength: 500
          }
        ],

        default: []
      },

      watchlistScreening: {
        type:
          watchlistScreeningSchema,

        default: () => ({
          status:
            WATCHLIST_STATUSES
              .UNAVAILABLE,

          simulated: true,

          screenedAt: null
        })
      },

      inputSnapshot: {
        type:
          inputSnapshotSchema,

        default: undefined
      },

      rulesVersion: {
        type: String,
        required: true,
        default: RISK_RULES_VERSION,
        trim: true,
        maxlength: 50
      },

      assessmentError: {
        type: String,
        default: null,
        trim: true,
        maxlength: 1000
      },

      assessedAt: {
        type: Date,
        default: null,
        index: true
      }
    },
    {
      timestamps: true
    }
  );

function determineExpectedRiskLevel(
  score
) {
  if (
    score <=
    RISK_THRESHOLDS[
      RISK_LEVELS.LOW
    ].max
  ) {
    return RISK_LEVELS.LOW;
  }

  if (
    score <=
    RISK_THRESHOLDS[
      RISK_LEVELS.MEDIUM
    ].max
  ) {
    return RISK_LEVELS.MEDIUM;
  }

  return RISK_LEVELS.HIGH;
}

riskAssessmentSchema.pre(
  "validate",
  function validateAssessmentState() {
    if (
      this.assessmentStatus ===
      ASSESSMENT_STATUSES.COMPLETED
    ) {
      if (
        !Number.isFinite(
          this.riskScore
        )
      ) {
        this.invalidate(
          "riskScore",
          "A completed assessment requires a valid risk score"
        );
      }

      if (!this.riskLevel) {
        this.invalidate(
          "riskLevel",
          "A completed assessment requires a risk level"
        );
      }

      if (!this.recommendation) {
        this.invalidate(
          "recommendation",
          "A completed assessment requires a recommendation"
        );
      }

      if (
        typeof this.reviewRequired !==
        "boolean"
      ) {
        this.invalidate(
          "reviewRequired",
          "A completed assessment requires a review decision"
        );
      }

      if (!this.inputSnapshot) {
        this.invalidate(
          "inputSnapshot",
          "A completed assessment requires an input snapshot"
        );
      }

      if (
        !this.watchlistScreening
          ?.screenedAt
      ) {
        this.invalidate(
          "watchlistScreening.screenedAt",
          "A completed assessment requires a watchlist screening date"
        );
      }

      if (!this.assessedAt) {
        this.invalidate(
          "assessedAt",
          "A completed assessment requires an assessment date"
        );
      }

      if (
        Number.isFinite(
          this.riskScore
        )
      ) {
        const expectedRiskLevel =
          determineExpectedRiskLevel(
            this.riskScore
          );

        if (
          this.riskLevel !==
          expectedRiskLevel
        ) {
          this.invalidate(
            "riskLevel",
            "Risk level does not match the calculated risk score"
          );
        }

        const expectedOutcome =
          RISK_LEVEL_OUTCOMES[
          expectedRiskLevel
          ];

        if (
          this.recommendation !==
          expectedOutcome
            .recommendation
        ) {
          this.invalidate(
            "recommendation",
            "Recommendation does not match the risk level"
          );
        }

        if (
          this.reviewRequired !==
          expectedOutcome
            .reviewRequired
        ) {
          this.invalidate(
            "reviewRequired",
            "Review requirement does not match the risk level"
          );
        }
      }

      if (this.assessmentError) {
        this.invalidate(
          "assessmentError",
          "A completed assessment cannot contain an assessment error"
        );
      }
    }

    if (
      this.assessmentStatus ===
      ASSESSMENT_STATUSES.FAILED
    ) {
      if (
        !this.assessmentError ||
        this.assessmentError
          .trim()
          .length === 0
      ) {
        this.invalidate(
          "assessmentError",
          "A failed assessment requires an error message"
        );
      }

      if (!this.assessedAt) {
        this.invalidate(
          "assessedAt",
          "A failed assessment requires an assessment date"
        );
      }

      if (this.riskScore !== null) {
        this.invalidate(
          "riskScore",
          "A failed assessment cannot contain a final risk score"
        );
      }

      if (this.riskLevel !== null) {
        this.invalidate(
          "riskLevel",
          "A failed assessment cannot contain a final risk level"
        );
      }

      if (
        this.recommendation !== null
      ) {
        this.invalidate(
          "recommendation",
          "A failed assessment cannot contain a recommendation"
        );
      }
    }
  }
);

riskAssessmentSchema.index({
  userId: 1,
  assessedAt: -1
});

riskAssessmentSchema.index({
  riskLevel: 1,
  assessedAt: -1
});

const RiskAssessment =
  mongoose.models.RiskAssessment ||
  mongoose.model(
    "RiskAssessment",
    riskAssessmentSchema
  );

export default RiskAssessment;