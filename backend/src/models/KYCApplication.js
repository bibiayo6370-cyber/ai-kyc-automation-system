import mongoose from "mongoose";

import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_VALUES,
  REVIEW_COMMENT_RULES
} from "../config/kycReviewConstants.js";

const kycApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },

    dateOfBirth: {
      type: Date,
      required: true,
      max: Date.now
    },

    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "other"]
    },

    nationality: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    residentialAddress: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 250
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^\+[1-9]\d{7,14}$/,
        "Phone number must use international format"
      ]
    },

    occupation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    applicationStatus: {
      type: String,
      enum:
        APPLICATION_STATUS_VALUES,
      default:
        APPLICATION_STATUSES.PENDING,
      index: true
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    reviewDate: {
      type: Date,
      default: null
    },

    reviewComments: {
      type: String,
      trim: true,
      minlength: [
        REVIEW_COMMENT_RULES.MIN_REQUIRED_LENGTH,
        `Review comments must contain at least ${REVIEW_COMMENT_RULES.MIN_REQUIRED_LENGTH} characters`
      ],
      maxlength: [
        REVIEW_COMMENT_RULES.MAX_LENGTH,
        `Review comments cannot exceed ${REVIEW_COMMENT_RULES.MAX_LENGTH} characters`
      ],
      default: null
    }
  },
  {
    timestamps: true
  }
);

function hasReviewValue(value) {
  return (
    value !== null &&
    value !== undefined
  );
}

function hasReviewComments(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

kycApplicationSchema.pre(
  "validate",
  function validateAdministratorReviewState() {
    const hasReviewer =
      hasReviewValue(
        this.reviewedBy
      );

    const hasReviewDate =
      hasReviewValue(
        this.reviewDate
      );

    const hasComments =
      hasReviewComments(
        this.reviewComments
      );

    if (
      this.applicationStatus ===
      APPLICATION_STATUSES.PENDING
    ) {
      if (
        hasReviewer ||
        hasReviewDate ||
        hasComments
      ) {
        this.invalidate(
          "applicationStatus",
          "Pending applications cannot contain administrator review details"
        );
      }

      return;
    }

    if (
      this.applicationStatus ===
      APPLICATION_STATUSES.UNDER_REVIEW
    ) {
      const reviewFieldCount =
        [
          hasReviewer,
          hasReviewDate,
          hasComments
        ].filter(Boolean).length;

      if (
        reviewFieldCount !== 0 &&
        reviewFieldCount !== 3
      ) {
        this.invalidate(
          "applicationStatus",
          "Applications retained under review must contain complete administrator review details"
        );
      }

      return;
    }

    if (
      this.applicationStatus ===
      APPLICATION_STATUSES.APPROVED ||
      this.applicationStatus ===
      APPLICATION_STATUSES.REJECTED
    ) {
      if (!hasReviewer) {
        this.invalidate(
          "reviewedBy",
          "A reviewer is required for a final KYC decision"
        );
      }

      if (!hasReviewDate) {
        this.invalidate(
          "reviewDate",
          "A review date is required for a final KYC decision"
        );
      }
    }

    if (
      this.applicationStatus ===
      APPLICATION_STATUSES.REJECTED &&
      !hasComments
    ) {
      this.invalidate(
        "reviewComments",
        "Review comments are required when a KYC application is rejected"
      );
    }
  }
);

const KYCApplication = mongoose.model(
  "KYCApplication",
  kycApplicationSchema
);

export default KYCApplication;