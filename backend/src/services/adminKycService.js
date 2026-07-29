import mongoose from "mongoose";

import { ASSESSMENT_STATUSES, RISK_LEVELS } from "../config/riskConstants.js";
import KYCDocument from "../models/KYCDocument.js";
import AuditLog from "../models/AuditLog.js";
import { APPLICATION_STATUSES } from "../config/kycReviewConstants.js";
import KYCApplication from "../models/KYCApplication.js";
import RiskAssessment from "../models/RiskAssessment.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const RISK_LEVEL_VALUES =
  Object.freeze(
    Object.values(
      RISK_LEVELS
    )
  );

const RISK_PRIORITY =
  Object.freeze({
    [RISK_LEVELS.HIGH]:
      0,

    [RISK_LEVELS.MEDIUM]:
      1,

    [RISK_LEVELS.LOW]:
      2
  });

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

function parsePositiveInteger(
  value,
  fieldName,
  defaultValue,
  maximumValue
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

  const parsedValue = Number(value);

  if (
    !Number.isInteger(
      parsedValue
    ) ||
    parsedValue < 1
  ) {
    throw createServiceError(
      `${fieldName} must be a positive integer`,
      400
    );
  }

  if (
    maximumValue &&
    parsedValue > maximumValue
  ) {
    throw createServiceError(
      `${fieldName} cannot exceed ${maximumValue}`,
      400
    );
  }

  return parsedValue;
}

function normalizeRiskLevel(
  riskLevel
) {
  if (
    riskLevel === undefined ||
    riskLevel === null ||
    riskLevel === ""
  ) {
    return null;
  }

  if (
    typeof riskLevel !==
    "string"
  ) {
    throw createServiceError(
      "Risk level must be text",
      400
    );
  }

  const normalizedRiskLevel =
    riskLevel
      .trim()
      .toLowerCase();

  if (
    !RISK_LEVEL_VALUES.includes(normalizedRiskLevel)
  ) {
    throw createServiceError(
      "Risk level must be low, medium or high",
      400
    );
  }

  return normalizedRiskLevel;
}

function createQueueItem({
  application,
  assessment
}) {
  const customer = application.userId;

  return {
    applicationId: application._id,
    submittedName: application.fullName,
    applicationStatus: application.applicationStatus,
    submittedAt: application.createdAt,
    updatedAt: application.updatedAt,

    customer: {
      id: customer?._id ?? null,
      accountName: customer?.fullName ?? null,
      email: customer?.email ?? null,
      phoneNumber: customer?.phoneNumber ?? null,
      accountStatus: customer?.status ?? null
    },

    riskAssessment: {
      id: assessment._id,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      recommendation: assessment.recommendation,
      reviewRequired: assessment.reviewRequired,
      assessedAt: assessment.assessedAt
    }
  };
}

function compareQueueItems(
  firstItem,
  secondItem
) {
  const firstPriority =
    RISK_PRIORITY[
    firstItem
      .riskAssessment
      .riskLevel
    ];

  const secondPriority =
    RISK_PRIORITY[
    secondItem
      .riskAssessment
      .riskLevel
    ];

  if (
    firstPriority !==
    secondPriority
  ) {
    return (
      firstPriority -
      secondPriority
    );
  }

  return (
    new Date(
      firstItem
        .riskAssessment
        .assessedAt
    ) -
    new Date(
      secondItem
        .riskAssessment
        .assessedAt
    )
  );
}

function createAdministratorSummary(
  administrator
) {
  if (!administrator) {
    return null;
  }

  return {
    id:
      administrator._id,

    fullName:
      administrator.fullName,

    email:
      administrator.email,

    role:
      administrator.role,

    accountStatus:
      administrator.status
  };
}

function createAuditTrailItem(
  auditLog
) {
  return {
    id:
      auditLog._id,

    action:
      auditLog.action,

    actorRole:
      auditLog.actorRole,

    actor:
      createAdministratorSummary(
        auditLog.actorId
      ),

    previousStatus:
      auditLog.previousStatus,

    newStatus:
      auditLog.newStatus,

    reviewComments:
      auditLog.reviewComments,

    riskAssessmentId:
      auditLog.riskAssessmentId,

    createdAt:
      auditLog.createdAt
  };
}

export async function getAdministratorReviewQueue({
  page,
  limit,
  riskLevel
} = {}) {
  const normalizedPage =
    parsePositiveInteger(
      page,
      "Page",
      DEFAULT_PAGE
    );

  const normalizedLimit =
    parsePositiveInteger(
      limit,
      "Limit",
      DEFAULT_LIMIT,
      MAX_LIMIT
    );

  const normalizedRiskLevel =
    normalizeRiskLevel(
      riskLevel
    );

  const applications =
    await KYCApplication.find({
      applicationStatus:
        APPLICATION_STATUSES
          .UNDER_REVIEW
    })
      .populate({
        path:
          "userId",

        select:
          "fullName email phoneNumber status"
      })
      .lean();

  const applicationIds =
    applications.map(
      application =>
        application._id
    );

  const assessments =
    applicationIds.length === 0
      ? []
      : await RiskAssessment.find({
        applicationId: {
          $in:
            applicationIds
        },

        assessmentStatus:
          ASSESSMENT_STATUSES
            .COMPLETED
      })
        .select(
          "applicationId riskScore riskLevel recommendation reviewRequired assessedAt"
        )
        .lean();

  const assessmentByApplicationId =
    new Map(
      assessments.map(
        assessment => [
          String(
            assessment.applicationId
          ),

          assessment
        ]
      )
    );

  let queue =
    applications
      .map(application => {
        const assessment =
          assessmentByApplicationId.get(
            String(
              application._id
            )
          );

        if (!assessment) {
          return null;
        }

        return createQueueItem({
          application,
          assessment
        });
      })
      .filter(Boolean);

  if (normalizedRiskLevel) {
    queue =
      queue.filter(
        item =>
          item
            .riskAssessment
            .riskLevel ===
          normalizedRiskLevel
      );
  }

  queue.sort(
    compareQueueItems
  );

  const totalItems =
    queue.length;

  const totalPages =
    totalItems === 0
      ? 0
      : Math.ceil(
        totalItems /
        normalizedLimit
      );

  const startIndex =
    (
      normalizedPage - 1
    ) *
    normalizedLimit;

  return {
    queue:
      queue.slice(
        startIndex,
        startIndex +
        normalizedLimit
      ),

    filters: {
      riskLevel:
        normalizedRiskLevel
    },

    pagination: {
      page:
        normalizedPage,

      limit:
        normalizedLimit,

      totalItems,

      totalPages
    }
  };
}

export async function getAdministratorApplicationDetail({
  applicationId
}) {
  validateObjectId(applicationId, "application ID");

  const application =
    await KYCApplication.findById(applicationId)
      .populate({
        path: "userId", select: "fullName email phoneNumber role status createdAt"
      })
      .populate({
        path: "reviewedBy", select: "fullName email role status"
      })
      .lean();

  if (!application) {
    throw createServiceError("KYC application not found",
      404
    );
  }

  const [document, assessment, auditLogs] =
    await Promise.all([
      KYCDocument.findOne({ applicationId: application._id })
        .select(
          "documentType originalName mimeType fileSize ocrStatus extractedText ocrConfidence verificationStatus nameMatchScore processingError createdAt updatedAt"
        )
        .lean(),

      RiskAssessment.findOne({
        applicationId: application._id
      })
        .select(
          "assessmentStatus riskScore riskLevel recommendation reviewRequired riskFactors assessmentReasons watchlistScreening inputSnapshot rulesVersion assessmentError assessedAt createdAt updatedAt"
        )
        .lean(),

      AuditLog.find({ applicationId: application._id })
        .populate({
          path: "actorId", select: "fullName email role status"
        })
        .sort({ createdAt: 1, _id: 1 }).lean()
    ]);

  const customer = application.userId;

  return {
    application: {
      id: application._id,
      fullName: application.fullName,
      dateOfBirth: application.dateOfBirth,
      gender: application.gender,
      nationality: application.nationality,
      residentialAddress: application.residentialAddress,
      phoneNumber: application.phoneNumber,
      occupation: application.occupation,
      applicationStatus: application.applicationStatus,
      submittedAt: application.createdAt,
      updatedAt: application.updatedAt,
      review: {
        reviewedBy: createAdministratorSummary(application.reviewedBy), reviewDate: application.reviewDate, reviewComments: application.reviewComments
      }
    },

    customer: {
      id: customer?._id ?? null,
      fullName: customer?.fullName ?? null,
      email: customer?.email ?? null,
      phoneNumber: customer?.phoneNumber ?? null,
      role: customer?.role ?? null,
      accountStatus: customer?.status ?? null,
      accountCreatedAt: customer?.createdAt ?? null
    },

    document: document ? {
      id: document._id,
      documentType: document.documentType,
      originalName: document.originalName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      ocrStatus: document.ocrStatus,
      extractedText: document.extractedText,
      ocrConfidence: document.ocrConfidence,
      verificationStatus: document.verificationStatus,
      nameMatchScore: document.nameMatchScore,
      processingError: document.processingError,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    } : null,

    riskAssessment: assessment ? {
      id: assessment._id,
      assessmentStatus: assessment.assessmentStatus,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      recommendation: assessment.recommendation,
      reviewRequired: assessment.reviewRequired,
      riskFactors: assessment.riskFactors,
      assessmentReasons: assessment.assessmentReasons,
      watchlistScreening: assessment.watchlistScreening,
      inputSnapshot: assessment.inputSnapshot,
      rulesVersion: assessment.rulesVersion,
      assessmentError: assessment.assessmentError,
      assessedAt: assessment.assessedAt,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt
    } : null,

    auditTrail: auditLogs.map(createAuditTrailItem)
  };
}