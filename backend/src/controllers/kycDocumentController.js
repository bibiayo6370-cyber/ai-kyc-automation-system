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
    const document =
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

    const processingSuccessful =
      document.ocrStatus ===
      "processed";

    return res.status(201).json({
      success: true,

      message:
        processingSuccessful
          ? "KYC document uploaded and processed successfully"
          : "KYC document uploaded, but OCR processing failed",

      document
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