import {
  createHash
} from "node:crypto";

import mongoose from "mongoose";

import {
  DOCUMENT_TYPES,
  DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES
} from "../config/documentConstants.js";

import KYCApplication from
  "../models/KYCApplication.js";

import KYCDocument from
  "../models/KYCDocument.js";

import {
  storeDocumentFile,
  deleteDocumentFile
} from "./gridFsService.js";

import {
  recognizeDocument
} from "./ocrService.js";

import {
  verifyNameInOcrText
} from "./nameVerificationService.js";

import {
  validateDecodableImage
} from "./imageValidationService.js";

import {
  assessApplicationRisk,
  recordRiskAssessmentFailure
} from "./riskAssessmentService.js";

const allowedDocumentTypes =
  new Set(DOCUMENT_TYPES);

const allowedMimeTypes =
  new Set(DOCUMENT_MIME_TYPES);

const MAX_PROCESSING_ERROR_LENGTH = 1000;

function createServiceError(
  message,
  statusCode,
  cause
) {
  const error = new Error(message);

  error.statusCode = statusCode;

  if (cause) {
    error.cause = cause;
  }

  return error;
}

function toObjectId(
  value,
  fieldName
) {
  if (
    value instanceof
    mongoose.Types.ObjectId
  ) {
    return value;
  }

  if (
    !mongoose.isObjectIdOrHexString(
      value
    )
  ) {
    throw createServiceError(
      `${fieldName} is invalid`,
      400
    );
  }

  return new mongoose.Types.ObjectId(
    value
  );
}

function validateDocumentType(
  documentType
) {
  if (
    typeof documentType !== "string" ||
    !documentType.trim()
  ) {
    throw createServiceError(
      "Document type is required",
      400
    );
  }

  const normalizedDocumentType =
    documentType.trim();

  if (
    !allowedDocumentTypes.has(
      normalizedDocumentType
    )
  ) {
    throw createServiceError(
      `${normalizedDocumentType} is not a supported document type`,
      400
    );
  }

  return normalizedDocumentType;
}

function validateUploadedFile(file) {
  if (
    !file ||
    !Buffer.isBuffer(file.buffer) ||
    file.buffer.length === 0
  ) {
    throw createServiceError(
      "A JPEG or PNG document is required",
      400
    );
  }

  if (
    !allowedMimeTypes.has(file.mimetype)
  ) {
    throw createServiceError(
      "Only JPEG and PNG documents are allowed",
      415
    );
  }

  if (
    file.buffer.length >
    MAX_DOCUMENT_SIZE_BYTES
  ) {
    throw createServiceError(
      "Uploaded document cannot exceed 5 MB",
      413
    );
  }

  if (
    typeof file.originalname !==
    "string" ||
    !file.originalname.trim()
  ) {
    throw createServiceError(
      "Original filename is required",
      400
    );
  }

  return {
    buffer: file.buffer,
    originalName:
      file.originalname.trim(),
    mimeType: file.mimetype,
    fileSize: file.buffer.length
  };
}

function generateFileHash(buffer) {
  return createHash("sha256")
    .update(buffer)
    .digest("hex");
}

function normalizeProcessingError(error) {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown OCR processing error";

  return message
    .trim()
    .slice(
      0,
      MAX_PROCESSING_ERROR_LENGTH
    );
}

function isDuplicateDocumentError(error) {
  return (
    error?.code === 11000 &&
    (
      error.keyPattern?.applicationId ||
      error.keyValue?.applicationId
    )
  );
}

async function deleteStoredFileQuietly(
  gridFsFileId
) {
  if (!gridFsFileId) {
    return;
  }

  try {
    await deleteDocumentFile(
      gridFsFileId
    );
  } catch (cleanupError) {
    console.error(
      "GridFS document cleanup failed:",
      cleanupError.message
    );
  }
}

async function getOwnedApplication(
  applicationId,
  userId
) {
  const applicationObjectId =
    toObjectId(
      applicationId,
      "KYC application ID"
    );

  const userObjectId =
    toObjectId(
      userId,
      "User ID"
    );

  const application =
    await KYCApplication.findOne({
      _id: applicationObjectId,
      userId: userObjectId
    });

  if (!application) {
    throw createServiceError(
      "KYC application not found",
      404
    );
  }

  return application;
}

async function getOwnedPendingApplication(
  applicationId,
  userId
) {
  const application =
    await getOwnedApplication(
      applicationId,
      userId
    );

  if (
    application.applicationStatus !==
    "pending"
  ) {
    throw createServiceError(
      "Documents can only be uploaded while the KYC application is pending",
      409
    );
  }

  return application;
}

async function createDocumentRecord({
  application,
  userId,
  gridFsFileId,
  documentType,
  file,
  fileHash
}) {
  try {
    return await KYCDocument.create({
      applicationId:
        application._id,

      userId,

      gridFsFileId,

      documentType,

      originalName:
        file.originalName,

      mimeType:
        file.mimeType,

      fileSize:
        file.fileSize,

      fileHash,

      ocrStatus: "processing",

      verificationStatus:
        "pending"
    });
  } catch (error) {
    await deleteStoredFileQuietly(
      gridFsFileId
    );

    if (
      isDuplicateDocumentError(error)
    ) {
      throw createServiceError(
        "A document has already been uploaded for this KYC application",
        409
      );
    }

    throw error;
  }
}

async function recordOcrFailure(
  document,
  error
) {
  document.ocrStatus = "failed";

  document.verificationStatus =
    "failed";

  document.extractedText = null;

  document.ocrConfidence = null;

  document.nameMatchScore = null;

  document.processingError =
    normalizeProcessingError(error);

  try {
    await document.save();
  } catch (saveError) {
    throw createServiceError(
      "OCR processing failed and the document status could not be updated",
      500,
      saveError
    );
  }

  return document;
}

async function runAutomaticRiskAssessment({
  applicationId,
  userId,
  documentId
}) {
  try {
    return await assessApplicationRisk({
      applicationId,
      userId
    });
  } catch (assessmentError) {
    /*
     * The document and its final OCR status have
     * already been saved. A risk-assessment
     * failure must not undo the document upload.
     */
    try {
      return await recordRiskAssessmentFailure({
        applicationId,
        userId,
        documentId,
        error:
          assessmentError
      });
    } catch (
    failurePersistenceError
    ) {
      console.error(
        "Automatic risk assessment failed and its failure state could not be recorded:",
        failurePersistenceError
      );

      return null;
    }
  }
}


export async function processKYCDocument({
  applicationId,
  userId,
  file,
  documentType
}) {
  if (!userId) {
    throw createServiceError(
      "Authenticated user is required",
      401
    );
  }

  const normalizedDocumentType =
    validateDocumentType(
      documentType
    );

  const validatedFile =
    validateUploadedFile(file);

  const application =
    await getOwnedPendingApplication(
      applicationId,
      userId
    );

  const existingDocument =
    await KYCDocument.exists({
      applicationId:
        application._id
    });

  if (existingDocument) {
    throw createServiceError(
      "A document has already been uploaded for this KYC application",
      409
    );
  }

  await validateDecodableImage(
    validatedFile.buffer,
    validatedFile.mimeType
  );

  const fileHash =
    generateFileHash(
      validatedFile.buffer
    );

  const storedFile =
    await storeDocumentFile({
      buffer:
        validatedFile.buffer,

      applicationId:
        application._id,

      userId,

      documentType:
        normalizedDocumentType,

      originalName:
        validatedFile.originalName,

      mimeType:
        validatedFile.mimeType,

      fileHash
    });

  const document =
    await createDocumentRecord({
      application,
      userId,
      gridFsFileId:
        storedFile.gridFsFileId,
      documentType:
        normalizedDocumentType,
      file:
        validatedFile,
      fileHash
    });

  let ocrResult;

  try {
    ocrResult =
      await recognizeDocument(
        validatedFile.buffer
      );
  } catch (error) {
    const failedDocument =
      await recordOcrFailure(
        document,
        error
      );

    const riskAssessment =
      await runAutomaticRiskAssessment({
        applicationId:
          application._id,

        userId:
          application.userId,

        documentId:
          failedDocument._id
      });

    return {
      document:
        failedDocument,

      riskAssessment
    };
  }

  const nameVerification =
    verifyNameInOcrText(
      application.fullName,
      ocrResult.extractedText
    );

  document.extractedText =
    ocrResult.extractedText ||
    null;

  document.ocrConfidence =
    ocrResult.ocrConfidence;

  document.ocrStatus =
    "processed";

  document.verificationStatus =
    nameVerification
      .verificationStatus;

  document.nameMatchScore =
    nameVerification
      .nameMatchScore;

  document.processingError =
    null;

  const savedDocument =
    await document.save();

  const riskAssessment =
    await runAutomaticRiskAssessment({
      applicationId:
        application._id,

      userId:
        application.userId,

      documentId:
        savedDocument._id
    });

  return {
    document:
      savedDocument,

    riskAssessment
  };
}

export async function getKYCDocuments(
  applicationId,
  userId
) {
  if (!userId) {
    throw createServiceError(
      "Authenticated user is required",
      401
    );
  }

  const application =
    await getOwnedApplication(
      applicationId,
      userId
    );

  return KYCDocument.find({
    applicationId:
      application._id,
    userId
  }).sort({
    createdAt: -1
  });
}

export async function getKYCDocumentById({
  applicationId,
  documentId,
  userId
}) {
  if (!userId) {
    throw createServiceError(
      "Authenticated user is required",
      401
    );
  }

  const application =
    await getOwnedApplication(
      applicationId,
      userId
    );

  const documentObjectId =
    toObjectId(
      documentId,
      "KYC document ID"
    );

  const document =
    await KYCDocument.findOne({
      _id: documentObjectId,
      applicationId:
        application._id,
      userId
    });

  if (!document) {
    throw createServiceError(
      "KYC document not found",
      404
    );
  }

  return document;
}
