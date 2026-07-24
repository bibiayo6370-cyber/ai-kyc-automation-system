import mongoose from "mongoose";

import {
  DUPLICATE_IDENTITY_DOCUMENT_TYPES,
  ASSESSMENT_STATUSES,
  RISK_RULES_VERSION,
  WATCHLIST_STATUSES
} from "../config/riskConstants.js";

import KYCApplication from
  "../models/KYCApplication.js";

import KYCDocument from
  "../models/KYCDocument.js";

import RiskAssessment from
  "../models/RiskAssessment.js";

import {
  calculateRiskAssessment
} from "./riskScoringService.js";

import {
  screenSimulatedWatchlist
} from "./watchlistService.js";

const FINAL_OCR_STATUSES =
  new Set([
    "processed",
    "failed"
  ]);

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
    !mongoose.isValidObjectId(
      value
    )
  ) {
    throw createServiceError(
      `A valid ${fieldName} is required`,
      400
    );
  }
}

function objectIdsMatch(
  firstValue,
  secondValue
) {
  return (
    String(firstValue) ===
    String(secondValue)
  );
}

function hasExtractedText(
  extractedText
) {
  return (
    typeof extractedText ===
    "string" &&
    extractedText.trim().length > 0
  );
}

async function findOwnedApplication({
  applicationId,
  userId
}) {
  const application =
    await KYCApplication.findOne({
      _id: applicationId,
      userId
    });

  if (!application) {
    throw createServiceError(
      "KYC application not found",
      404
    );
  }

  return application;
}

async function findReadyDocument({
  applicationId,
  userId
}) {
  const document =
    await KYCDocument.findOne({
      applicationId,
      userId
    });

  if (!document) {
    throw createServiceError(
      "A KYC document is required before risk assessment",
      409
    );
  }

  if (
    !FINAL_OCR_STATUSES.has(
      document.ocrStatus
    )
  ) {
    throw createServiceError(
      "KYC document processing is not complete",
      409
    );
  }

  return document;
}

export async function detectDuplicateIdentityDocument(
  document
) {
  if (
    !document ||
    !DUPLICATE_IDENTITY_DOCUMENT_TYPES
      .includes(
        document.documentType
      )
  ) {
    return false;
  }

  const duplicateDocument =
    await KYCDocument.exists({
      _id: {
        $ne: document._id
      },

      userId: {
        $ne: document.userId
      },

      fileHash:
        document.fileHash,

      documentType: {
        $in:
          DUPLICATE_IDENTITY_DOCUMENT_TYPES
      }
    });

  return Boolean(
    duplicateDocument
  );
}

function createInputSnapshot({
  document,
  duplicateDocumentDetected
}) {
  return {
    documentType:
      document.documentType,

    ocrStatus:
      document.ocrStatus,

    extractedTextPresent:
      hasExtractedText(
        document.extractedText
      ),

    ocrConfidence:
      document.ocrConfidence ??
      null,

    verificationStatus:
      document.verificationStatus,

    nameMatchScore:
      document.nameMatchScore ??
      null,

    duplicateDocumentDetected
  };
}

function validateExistingAssessmentOwnership({
  assessment,
  application,
  document
}) {
  if (
    !objectIdsMatch(
      assessment.userId,
      application.userId
    ) ||
    !objectIdsMatch(
      assessment.documentId,
      document._id
    )
  ) {
    throw createServiceError(
      "Existing risk assessment ownership is inconsistent",
      409
    );
  }
}

async function saveCompletedAssessment({
  application,
  document,
  scoringResult,
  watchlistScreening,
  inputSnapshot
}) {
  let assessment =
    await RiskAssessment.findOne({
      applicationId:
        application._id
    });

  if (assessment) {
    validateExistingAssessmentOwnership({
      assessment,
      application,
      document
    });
  } else {
    assessment =
      new RiskAssessment({
        applicationId:
          application._id,

        userId:
          application.userId,

        documentId:
          document._id
      });
  }

  const assessedAt =
    new Date();

  assessment.set({
    assessmentStatus:
      ASSESSMENT_STATUSES
        .COMPLETED,

    riskScore:
      scoringResult.riskScore,

    riskLevel:
      scoringResult.riskLevel,

    recommendation:
      scoringResult
        .recommendation,

    reviewRequired:
      scoringResult
        .reviewRequired,

    riskFactors:
      scoringResult
        .riskFactors,

    assessmentReasons:
      scoringResult
        .assessmentReasons,

    watchlistScreening,

    inputSnapshot,

    rulesVersion:
      RISK_RULES_VERSION,

    assessmentError:
      null,

    assessedAt
  });

  await assessment.save();

  return assessment;
}

function normalizeAssessmentError(
  error
) {
  const message =
    error instanceof Error &&
      typeof error.message ===
      "string" &&
      error.message.trim()
        .length > 0
      ? error.message.trim()
      : "Risk assessment could not be completed";

  return message.slice(
    0,
    1000
  );
}

export async function recordRiskAssessmentFailure({
  applicationId,
  userId,
  documentId,
  error
}) {
  validateObjectId(
    applicationId,
    "application ID"
  );

  validateObjectId(
    userId,
    "user ID"
  );

  validateObjectId(
    documentId,
    "document ID"
  );

  let assessment =
    await RiskAssessment.findOne({
      applicationId
    });

  if (assessment) {
    if (
      !objectIdsMatch(
        assessment.userId,
        userId
      ) ||
      !objectIdsMatch(
        assessment.documentId,
        documentId
      )
    ) {
      throw createServiceError(
        "Existing risk assessment ownership is inconsistent",
        409
      );
    }
  } else {
    assessment =
      new RiskAssessment({
        applicationId,
        userId,
        documentId
      });
  }

  assessment.set({
    assessmentStatus:
      ASSESSMENT_STATUSES
        .FAILED,

    riskScore: null,
    riskLevel: null,
    recommendation: null,
    reviewRequired: null,

    riskFactors: [],
    assessmentReasons: [],

    watchlistScreening: {
      status:
        WATCHLIST_STATUSES
          .UNAVAILABLE,

      referenceId: null,
      matchedName: null,
      simulated: true,
      screenedAt: null
    },

    inputSnapshot:
      undefined,

    rulesVersion:
      RISK_RULES_VERSION,

    assessmentError:
      normalizeAssessmentError(
        error
      ),

    assessedAt:
      new Date()
  });

  await assessment.save();

  return assessment;
}

export async function assessApplicationRisk({
  applicationId,
  userId
}) {
  validateObjectId(
    applicationId,
    "application ID"
  );

  validateObjectId(
    userId,
    "user ID"
  );

  const application =
    await findOwnedApplication({
      applicationId,
      userId
    });

  const document =
    await findReadyDocument({
      applicationId:
        application._id,

      userId:
        application.userId
    });

  const duplicateDocumentDetected =
    await detectDuplicateIdentityDocument(
      document
    );

  const watchlistScreening =
    screenSimulatedWatchlist(
      application.fullName
    );

  const scoringResult =
    calculateRiskAssessment({
      ocrStatus:
        document.ocrStatus,

      extractedText:
        document.extractedText,

      ocrConfidence:
        document.ocrConfidence,

      verificationStatus:
        document.verificationStatus,

      nameMatchScore:
        document.nameMatchScore,

      watchlistStatus:
        watchlistScreening.status,

      duplicateDocumentDetected
    });

  const inputSnapshot =
    createInputSnapshot({
      document,
      duplicateDocumentDetected
    });

  return saveCompletedAssessment({
    application,
    document,
    scoringResult,
    watchlistScreening,
    inputSnapshot
  });
}