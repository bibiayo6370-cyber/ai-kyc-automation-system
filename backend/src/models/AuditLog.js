import mongoose from "mongoose";

import {
  APPLICATION_STATUS_VALUES,
  REVIEW_COMMENT_RULES
} from "../config/kycReviewConstants.js";

import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ACTOR_ROLE_VALUES,
  AUDIT_ACTION_VALUES,
  getAuditActionPolicy
} from "../config/auditLogConstants.js";

const APPEND_ONLY_ERROR =
  "Audit logs are append-only and cannot be modified or deleted";

function hasMeaningfulComments(
  value
) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

const auditLogSchema =
  new mongoose.Schema(
    {
      applicationId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "KYCApplication",
        required: true,
        index: true,
        immutable: true
      },

      customerId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
        immutable: true
      },

      actorId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
        immutable: true
      },

      actorRole: {
        type: String,
        enum:
          AUDIT_ACTOR_ROLE_VALUES,
        required: true,
        immutable: true
      },

      action: {
        type: String,
        enum:
          AUDIT_ACTION_VALUES,
        required: true,
        immutable: true
      },

      previousStatus: {
        type: String,
        enum:
          APPLICATION_STATUS_VALUES,
        required: true,
        immutable: true
      },

      newStatus: {
        type: String,
        enum:
          APPLICATION_STATUS_VALUES,
        required: true,
        immutable: true
      },

      reviewComments: {
        type: String,
        trim: true,
        minlength: [
          REVIEW_COMMENT_RULES
            .MIN_REQUIRED_LENGTH,
          `Review comments must contain at least ${REVIEW_COMMENT_RULES.MIN_REQUIRED_LENGTH} characters`
        ],
        maxlength: [
          REVIEW_COMMENT_RULES.MAX_LENGTH,
          `Review comments cannot exceed ${REVIEW_COMMENT_RULES.MAX_LENGTH} characters`
        ],
        default: null,
        immutable: true
      },

      riskAssessmentId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "RiskAssessment",
        default: null,
        immutable: true
      }
    },
    {
      timestamps: {
        createdAt: true,
        updatedAt: false
      }
    }
  );

auditLogSchema.index({
  applicationId: 1,
  createdAt: 1
});

auditLogSchema.index({
  customerId: 1,
  createdAt: -1
});

auditLogSchema.pre(
  "validate",
  function validateAuditEvent() {
    let policy;

    try {
      policy =
        getAuditActionPolicy(
          this.action
        );
    } catch {
      this.invalidate(
        "action",
        "Unsupported audit action"
      );

      return;
    }

    if (
      this.actorRole !==
      policy.actorRole
    ) {
      this.invalidate(
        "actorRole",
        "Audit actor role does not match the action"
      );
    }

    if (
      this.previousStatus !==
      policy.previousStatus
    ) {
      this.invalidate(
        "previousStatus",
        "Audit previous status does not match the action"
      );
    }

    if (
      this.newStatus !==
      policy.newStatus
    ) {
      this.invalidate(
        "newStatus",
        "Audit new status does not match the action"
      );
    }

    if (
      this.actorRole ===
      AUDIT_ACTOR_ROLES.SYSTEM
    ) {
      if (this.actorId) {
        this.invalidate(
          "actorId",
          "System audit events cannot contain an administrator ID"
        );
      }

      if (!this.riskAssessmentId) {
        this.invalidate(
          "riskAssessmentId",
          "A risk assessment is required for the automated review transition"
        );
      }

      if (
        hasMeaningfulComments(
          this.reviewComments
        )
      ) {
        this.invalidate(
          "reviewComments",
          "System audit events cannot contain administrator review comments"
        );
      }
    }

    if (
      this.actorRole ===
      AUDIT_ACTOR_ROLES.ADMIN &&
      !this.actorId
    ) {
      this.invalidate(
        "actorId",
        "An administrator ID is required for an administrator audit event"
      );
    }

    if (
      policy.commentsRequired &&
      !hasMeaningfulComments(
        this.reviewComments
      )
    ) {
      this.invalidate(
        "reviewComments",
        "Review comments are required for this administrator action"
      );
    }
  }
);

auditLogSchema.pre(
  "save",
  function preventAuditDocumentUpdate() {
    if (!this.isNew) {
      throw new Error(
        APPEND_ONLY_ERROR
      );
    }
  }
);

const blockedAuditMutations =
  [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "replaceOne",
    "findOneAndReplace",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete"
  ];

for (
  const operation of
  blockedAuditMutations
) {
  auditLogSchema.pre(
    operation,
    function preventAuditQueryMutation() {
      throw new Error(
        APPEND_ONLY_ERROR
      );
    }
  );
}

const AuditLog =
  mongoose.model(
    "AuditLog",
    auditLogSchema
  );

export {
  APPEND_ONLY_ERROR
};

export default AuditLog;