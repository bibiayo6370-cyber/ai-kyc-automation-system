import {
  processKYCDocument,
  getKYCDocuments,
  getKYCDocumentById
} from
  "../services/kycDocumentService.js";

function sendDocumentError(
  res,
  error,
  operation
) {
  if (
    error?.name ===
    "ValidationError"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Document validation failed",
      errors: Object.values(
        error.errors
      ).map(
        (validationError) =>
          validationError.message
      )
    });
  }

  const statusCode =
    error.statusCode ?? 500;

  if (statusCode === 500) {
    console.error(
      `${operation} failed:`,
      error
    );
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? `Unable to ${operation}`
        : error.message
  });
}

export async function createDocument(
  req,
  res
) {
  try {
    const {
      document,
      riskAssessment
    } =
      await processKYCDocument({
        applicationId:
          req.params.applicationId,

        userId:
          req.user?._id,

        file:
          req.file,

        documentType:
          req.body?.documentType
      });

    const assessmentCompleted =
      riskAssessment
        ?.assessmentStatus ===
      "completed";

    let message;

    if (
      document.ocrStatus ===
      "failed"
    ) {
      message =
        assessmentCompleted
          ? "KYC document uploaded, but OCR processing failed and a high-risk assessment was recorded"
          : "KYC document uploaded, but OCR processing and automatic risk assessment could not be completed";
    } else if (
      assessmentCompleted
    ) {
      message =
        "KYC document uploaded, processed and assessed successfully";
    } else {
      message =
        "KYC document uploaded and processed, but automatic risk assessment is unavailable";
    }

    return res.status(201).json({
      success: true,
      message,

      document,

      riskAssessment:
        createRiskAssessmentSummary(
          riskAssessment
        )
    });
  } catch (error) {
    return sendDocumentError(
      res,
      error,
      "process KYC document"
    );
  }
}

export async function getDocuments(
  req,
  res
) {
  try {
    const documents =
      await getKYCDocuments(
        req.params.applicationId,
        req.user?._id
      );

    return res.status(200).json({
      success: true,
      message:
        "KYC documents retrieved successfully",
      count: documents.length,
      documents
    });
  } catch (error) {
    return sendDocumentError(
      res,
      error,
      "retrieve KYC documents"
    );
  }
}

export async function getDocumentById(
  req,
  res
) {
  try {
    const document =
      await getKYCDocumentById({
        applicationId:
          req.params.applicationId,

        documentId:
          req.params.documentId,

        userId:
          req.user?._id
      });

    return res.status(200).json({
      success: true,
      message:
        "KYC document details retrieved successfully",
      document
    });
  } catch (error) {
    return sendDocumentError(
      res,
      error,
      "retrieve KYC document details"
    );
  }
}

function createRiskAssessmentSummary(
  assessment
) {
  if (!assessment) {
    return {
      assessmentStatus:
        "unavailable",

      riskScore: null,
      riskLevel: null,
      recommendation: null,
      reviewRequired: null,
      assessmentReasons: [],
      assessedAt: null
    };
  }

  return {
    assessmentStatus:
      assessment.assessmentStatus,

    riskScore:
      assessment.riskScore ??
      null,

    riskLevel:
      assessment.riskLevel ??
      null,

    recommendation:
      assessment.recommendation ??
      null,

    reviewRequired:
      assessment.reviewRequired ??
      null,

    assessmentReasons:
      assessment.assessmentReasons ??
      [],

    assessedAt:
      assessment.assessedAt ??
      null
  };
}