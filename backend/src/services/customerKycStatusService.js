import mongoose from "mongoose";

import { isFinalApplicationStatus } from "../config/kycReviewConstants.js";
import KYCApplication from "../models/KYCApplication.js";
import RiskAssessment from "../models/RiskAssessment.js";

const CUSTOMER_STATUS_MESSAGES = Object.freeze({
  pending: "Your KYC application is awaiting document processing.",
  under_review: "Your KYC application is under administrator review.",
  approved: "Your KYC application has been approved.",
  rejected: "Your KYC application has been rejected."
});

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

function createRiskSummary(assessment) {
  if (!assessment) return null;

  return {
    id: assessment._id,
    assessmentStatus: assessment.assessmentStatus,
    riskScore: assessment.riskScore,
    riskLevel: assessment.riskLevel,
    recommendation: assessment.recommendation,
    reviewRequired: assessment.reviewRequired,
    assessmentReasons: assessment.assessmentReasons,
    assessedAt: assessment.assessedAt
  };
}

export async function getCustomerApplicationStatus({ applicationId, userId }) {
  validateObjectId(applicationId, "application ID");
  validateObjectId(userId, "user ID");

  const application = await KYCApplication.findOne({
    _id: applicationId,
    userId
  }).lean();

  if (!application) {
    throw createServiceError("KYC application not found", 404);
  }

  const assessment = await RiskAssessment.findOne({
    applicationId: application._id,
    userId: application.userId
  })
    .select(
      "assessmentStatus riskScore riskLevel recommendation reviewRequired assessmentReasons assessedAt"
    )
    .lean();

  return {
    applicationId: application._id,
    applicationStatus: application.applicationStatus,
    statusMessage: CUSTOMER_STATUS_MESSAGES[application.applicationStatus],
    submittedAt: application.createdAt,
    updatedAt: application.updatedAt,
    decision: {
      isFinal: isFinalApplicationStatus(application.applicationStatus),
      reviewDate: application.reviewDate,
      reviewComments: application.reviewComments
    },
    riskAssessment: createRiskSummary(assessment)
  };
}