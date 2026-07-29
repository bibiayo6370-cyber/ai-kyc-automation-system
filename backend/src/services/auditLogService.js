import mongoose from "mongoose";

import {
  REVIEW_COMMENT_RULES
} from "../config/kycReviewConstants.js";

import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ACTIONS,
  getAuditActionForAdminReview,
  getAuditActionPolicy
} from "../config/auditLogConstants.js";

import AuditLog from
  "../models/AuditLog.js";

function createServiceError(
  message,
  statusCode
) {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
}

function validateObjectId(
  value,
  fieldName
) {
  if (
    !value ||
    !mongoose.isObjectIdOrHexString(
      value
    )
  ) {
    throw createServiceError(
      `A valid ${fieldName} is required`,
      400
    );
  }
}

function normalizeReviewComments(
  reviewComments
) {
  if (
    reviewComments === null ||
    reviewComments === undefined
  ) {
    return null;
  }

  if (
    typeof reviewComments !==
    "string"
  ) {
    throw createServiceError(
      "Review comments must be text",
      400
    );
  }

  const normalizedComments =
    reviewComments.trim();

  if (
    normalizedComments.length === 0
  ) {
    return null;
  }

  if (
    normalizedComments.length <
    REVIEW_COMMENT_RULES
      .MIN_REQUIRED_LENGTH
  ) {
    throw createServiceError(
      `Review comments must contain at least ${REVIEW_COMMENT_RULES.MIN_REQUIRED_LENGTH} characters`,
      400
    );
  }

  if (
    normalizedComments.length >
    REVIEW_COMMENT_RULES.MAX_LENGTH
  ) {
    throw createServiceError(
      `Review comments cannot exceed ${REVIEW_COMMENT_RULES.MAX_LENGTH} characters`,
      400
    );
  }

  return normalizedComments;
}

export async function recordApplicationMovedToReview({
  applicationId,
  customerId,
  riskAssessmentId
}) {
  validateObjectId(
    applicationId,
    "application ID"
  );

  validateObjectId(
    customerId,
    "customer ID"
  );

  validateObjectId(
    riskAssessmentId,
    "risk assessment ID"
  );

  const action =
    AUDIT_ACTIONS
      .APPLICATION_MOVED_TO_REVIEW;

  const policy =
    getAuditActionPolicy(
      action
    );

  return AuditLog.create({
    applicationId,
    customerId,
    actorId: null,
    actorRole:
      AUDIT_ACTOR_ROLES.SYSTEM,
    action,
    previousStatus:
      policy.previousStatus,
    newStatus:
      policy.newStatus,
    reviewComments: null,
    riskAssessmentId
  });
}

export async function recordAdministratorReviewAction({
  applicationId,
  customerId,
  administratorId,
  action,
  reviewComments
}) {
  validateObjectId(
    applicationId,
    "application ID"
  );

  validateObjectId(
    customerId,
    "customer ID"
  );

  validateObjectId(
    administratorId,
    "administrator ID"
  );

  let auditAction;

  try {
    auditAction =
      getAuditActionForAdminReview(
        action
      );
  } catch {
    throw createServiceError(
      "Unsupported administrator review action",
      400
    );
  }

  const policy =
    getAuditActionPolicy(
      auditAction
    );

  const normalizedComments =
    normalizeReviewComments(
      reviewComments
    );

  if (
    policy.commentsRequired &&
    !normalizedComments
  ) {
    throw createServiceError(
      "Review comments are required for this administrator action",
      400
    );
  }

  return AuditLog.create({
    applicationId,
    customerId,
    actorId:
      administratorId,
    actorRole:
      AUDIT_ACTOR_ROLES.ADMIN,
    action:
      auditAction,
    previousStatus:
      policy.previousStatus,
    newStatus:
      policy.newStatus,
    reviewComments:
      normalizedComments,
    riskAssessmentId: null
  });
}

export async function getApplicationAuditLogs({
  applicationId
}) {
  validateObjectId(
    applicationId,
    "application ID"
  );

  return AuditLog.find({
    applicationId
  }).sort({
    createdAt: 1,
    _id: 1
  });
}