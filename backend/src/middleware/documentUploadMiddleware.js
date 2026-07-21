import multer from "multer";

import {
  DOCUMENT_TYPES,
  DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES
} from "../config/documentConstants.js";

const allowedDocumentTypes =
  new Set(DOCUMENT_TYPES);

const allowedMimeTypes =
  new Set(DOCUMENT_MIME_TYPES);

function createUploadError(
  message,
  statusCode,
  code
) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
}

const storage = multer.memoryStorage();

const documentUpload = multer({
  storage,

  limits: {
    fileSize: MAX_DOCUMENT_SIZE_BYTES,
    files: 1,
  },

  fileFilter(req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(
        createUploadError(
          "Only JPEG and PNG documents are allowed",
          415,
          "UNSUPPORTED_DOCUMENT_TYPE"
        )
      );
    }

    return callback(null, true);
  }
}).single("document");

function getMulterErrorResponse(error) {
  switch (error.code) {
    case "LIMIT_FILE_SIZE":
      return {
        statusCode: 413,
        message:
          "Uploaded document cannot exceed 5 MB"
      };

    case "LIMIT_FILE_COUNT":
      return {
        statusCode: 400,
        message:
          "Only one document may be uploaded"
      };

    case "LIMIT_FIELD_COUNT":
      return {
        statusCode: 400,
        message:
          "Too many form fields were provided"
      };

    case "LIMIT_PART_COUNT":
      return {
        statusCode: 400,
        message:
          "Too many multipart fields were provided"
      };

    case "LIMIT_UNEXPECTED_FILE":
      return {
        statusCode: 400,
        message:
          "The uploaded file must use the field name document"
      };

    default:
      return {
        statusCode: 400,
        message:
          "The document upload request is invalid"
      };
  }
}

function isValidJpeg(buffer) {
  return (
    Buffer.isBuffer(buffer) &&
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  );
}

function isValidPng(buffer) {
  const pngSignature = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a
  ]);

  return (
    Buffer.isBuffer(buffer) &&
    buffer.length >= pngSignature.length &&
    buffer
      .subarray(0, pngSignature.length)
      .equals(pngSignature)
  );
}

function hasValidFileSignature(file) {
  if (file.mimetype === "image/jpeg") {
    return isValidJpeg(file.buffer);
  }

  if (file.mimetype === "image/png") {
    return isValidPng(file.buffer);
  }

  return false;
}

export function uploadSingleDocument(
  req,
  res,
  next
) {
  documentUpload(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      const response =
        getMulterErrorResponse(error);

      return res
        .status(response.statusCode)
        .json({
          success: false,
          message: response.message
        });
    }

    const statusCode =
      error.statusCode ?? 500;

    if (statusCode === 500) {
      console.error(
        "Document upload failed:",
        error
      );
    }

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? "Unable to process document upload"
          : error.message
    });
  });
}

export function validateDocumentUpload(
  req,
  res,
  next
) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message:
        "A JPEG or PNG document is required"
    });
  }

  const bodyFieldNames =
    Object.keys(req.body ?? {});

  const unexpectedFields =
    bodyFieldNames.filter(
      (fieldName) =>
        fieldName !== "documentType"
    );

  if (unexpectedFields.length > 0) {
    return res.status(400).json({
      success: false,
      message:
        "Only the documentType form field is allowed"
    });
  }

  if (
    Array.isArray(
      req.body?.documentType
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Document type must be provided only once"
    });
  }

  if (!hasValidFileSignature(req.file)) {
    return res.status(415).json({
      success: false,
      message:
        "The uploaded file content is not a valid JPEG or PNG image"
    });
  }

  const documentType =
    typeof req.body?.documentType === "string"
      ? req.body.documentType.trim()
      : "";

  if (!documentType) {
    return res.status(400).json({
      success: false,
      message:
        "Document type is required"
    });
  }

  if (
    !allowedDocumentTypes.has(documentType)
  ) {
    return res.status(400).json({
      success: false,
      message:
        `${documentType} is not a supported document type`
    });
  }

  req.body.documentType = documentType;

  return next();
}