import mongoose from "mongoose";

import { ASSESSMENT_STATUSES } from "../config/riskConstants.js";
import {
  ADMIN_REVIEW_ACTION_VALUES, APPLICATION_STATUSES, REVIEW_COMMENT_RULES,
  getStatusForReviewAction, reviewActionRequiresComments
} from "../config/kycReviewConstants.js";

import User from "../models/User.js";
import KYCApplication from "../models/KYCApplication.js";
import RiskAssessment from "../models/RiskAssessment.js";
import { recordAdministratorReviewAction } from "./auditLogService.js";

function createServiceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateObjectId(value, fieldName) {
  if (!value || !mongoose.isObjectIdOrHexString(value)) {
    throw createServiceError(`A valid ${fieldName} is required`, 400);
  }
}

function normalizeReviewAction(action) {
  if (typeof action !== "string") {
    throw createServiceError("Administrator review action must be text", 400);
  }

  const normalizedAction = action.trim().toLowerCase();

  if (!ADMIN_REVIEW_ACTION_VALUES.includes(normalizedAction)) {
    throw createServiceError("Unsupported administrator review action", 400);
  }

  return normalizedAction;
}

function normalizeReviewComments(reviewComments, action) {
  if (
    reviewComments !== null &&
    reviewComments !== undefined &&
    typeof reviewComments !== "string"
  ) {
    throw createServiceError("Review comments must be text", 400);
  }

  const normalizedComments =
    typeof reviewComments === "string" && reviewComments.trim() ? reviewComments.trim() : null;

  if (reviewActionRequiresComments(action) && !normalizedComments) {
    throw createServiceError(
      "Review comments are required for this administrator action",
      400
    );
  }

  if (
    normalizedComments &&
    normalizedComments.length < REVIEW_COMMENT_RULES.MIN_REQUIRED_LENGTH
  ) {
    throw createServiceError(
      `Review comments must contain at least ${REVIEW_COMMENT_RULES.MIN_REQUIRED_LENGTH} characters`,
      400
    );
  }

  if (
    normalizedComments &&
    normalizedComments.length > REVIEW_COMMENT_RULES.MAX_LENGTH
  ) {
    throw createServiceError(
      `Review comments cannot exceed ${REVIEW_COMMENT_RULES.MAX_LENGTH} characters`,
      400
    );
  }

  return normalizedComments;
}

async function findActiveAdministrator(administratorId) {
  const administrator = await User.findOne({
    _id: administratorId,
    role: "admin",
    status: "active"
  }).select("_id");

  if (!administrator) {
    throw createServiceError(
      "Active administrator authorization is required",
      403
    );
  }

  return administrator;
}

async function findReviewableApplication(applicationId) {
  const application = await KYCApplication.findById(applicationId);

  if (!application) {
    throw createServiceError("KYC application not found", 404);
  }

  if (application.applicationStatus !== APPLICATION_STATUSES.UNDER_REVIEW) {
    throw createServiceError(
      "Only applications under review can receive an administrator decision",
      409
    );
  }

  return application;
}

async function findCompletedAssessment(applicationId) {
  const assessment = await RiskAssessment.findOne({
    applicationId,
    assessmentStatus: ASSESSMENT_STATUSES.COMPLETED
  });

  if (!assessment) {
    throw createServiceError(
      "A completed risk assessment is required before administrator review",
      409
    );
  }

  return assessment;
}

export async function reviewKycApplication({
  applicationId,
  administratorId,
  action,
  reviewComments
}) {
  validateObjectId(applicationId, "application ID");
  validateObjectId(administratorId, "administrator ID");

  const normalizedAction = normalizeReviewAction(action);
  const normalizedComments = normalizeReviewComments(
    reviewComments,
    normalizedAction
  );

  await findActiveAdministrator(administratorId);

  const application = await findReviewableApplication(applicationId);
  const assessment = await findCompletedAssessment(application._id);
  const newStatus = getStatusForReviewAction(normalizedAction);
  const reviewDate = new Date();

  const previousState = {
    applicationStatus: application.applicationStatus,
    reviewedBy: application.reviewedBy,
    reviewDate: application.reviewDate,
    reviewComments: application.reviewComments
  };

  application.set({
    applicationStatus: newStatus,
    reviewedBy: administratorId,
    reviewDate,
    reviewComments: normalizedComments
  });

  await application.save();

  let auditLog;

  try {
    auditLog = await recordAdministratorReviewAction({
      applicationId: application._id,
      customerId: application.userId,
      administratorId,
      action: normalizedAction,
      reviewComments: normalizedComments
    });
  } catch (auditError) {
    application.set(previousState);

    try {
      await application.save();
    } catch (rollbackError) {
      console.error(
        "Administrator review rollback failed:",
        rollbackError
      );
    }

    throw auditError;
  }

  return { application, assessment, auditLog };
}