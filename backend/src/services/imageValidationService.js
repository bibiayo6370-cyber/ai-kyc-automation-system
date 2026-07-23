import sharp from "sharp";

import {
  DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_PIXELS
} from "../config/documentConstants.js";

const supportedMimeTypes =
  new Set(DOCUMENT_MIME_TYPES);

const formatMimeTypes =
  Object.freeze({
    jpeg: "image/jpeg",
    png: "image/png"
  });

function createValidationError(
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

function validateImageBuffer(buffer) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length === 0
  ) {
    throw createValidationError(
      "Document image buffer is required",
      400
    );
  }
}

function normalizeDeclaredMimeType(
  declaredMimeType
) {
  if (
    typeof declaredMimeType !==
    "string" ||
    !declaredMimeType.trim()
  ) {
    throw createValidationError(
      "Declared image MIME type is required",
      400
    );
  }

  const normalizedMimeType =
    declaredMimeType
      .trim()
      .toLowerCase();

  if (
    !supportedMimeTypes.has(
      normalizedMimeType
    )
  ) {
    throw createValidationError(
      "Only JPEG and PNG documents are allowed",
      415
    );
  }

  return normalizedMimeType;
}

function getDetectedMimeType(format) {
  return formatMimeTypes[format] ?? null;
}

export async function validateDecodableImage(
  buffer,
  declaredMimeType
) {
  validateImageBuffer(buffer);

  const normalizedMimeType =
    normalizeDeclaredMimeType(
      declaredMimeType
    );

  try {
    /*
     * toBuffer() forces Sharp to decode and
     * produce the image. metadata() alone would
     * inspect only the image header.
     */
    const { info } =
      await sharp(buffer, {
        failOn: "warning",
        limitInputPixels:
          MAX_DOCUMENT_PIXELS
      }).toBuffer({
        resolveWithObject: true
      });

    const detectedMimeType =
      getDetectedMimeType(
        info.format
      );

    if (!detectedMimeType) {
      throw createValidationError(
        "The uploaded file is not a supported JPEG or PNG image",
        415
      );
    }

    if (
      detectedMimeType !==
      normalizedMimeType
    ) {
      throw createValidationError(
        "The uploaded file content does not match its declared image type",
        415
      );
    }

    if (
      !Number.isInteger(info.width) ||
      !Number.isInteger(info.height) ||
      info.width <= 0 ||
      info.height <= 0
    ) {
      throw createValidationError(
        "The uploaded image has invalid dimensions",
        415
      );
    }

    return {
      format: info.format,
      mimeType: detectedMimeType,
      width: info.width,
      height: info.height,
      channels: info.channels,
      decodedSize: info.size
    };
  } catch (error) {
    if (error?.statusCode) {
      throw error;
    }

    throw createValidationError(
      "The uploaded file is not a valid decodable JPEG or PNG image",
      415,
      error
    );
  }
}