import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import mongoose from "mongoose";

import { KYC_DOCUMENT_BUCKET_NAME } from "../config/constants.js";

let documentBucket;

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

function getDocumentBucket() {
  if (
    mongoose.connection.readyState !== 1 ||
    !mongoose.connection.db
  ) {
    throw createServiceError(
      "MongoDB connection is unavailable",
      503
    );
  }

  if (!documentBucket) {
    documentBucket =
      new mongoose.mongo.GridFSBucket(
        mongoose.connection.db,
        {
          bucketName:
            KYC_DOCUMENT_BUCKET_NAME
        }
      );
  }

  return documentBucket;
}

function toObjectId(value, fieldName) {
  if (
    value instanceof
    mongoose.Types.ObjectId
  ) {
    return value;
  }

  if (
    !mongoose.isObjectIdOrHexString(value)
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

function getFileExtension(mimeType) {
  if (mimeType === "image/jpeg") {
    return ".jpg";
  }

  if (mimeType === "image/png") {
    return ".png";
  }

  throw createServiceError(
    "Unsupported document MIME type",
    415
  );
}

function createStoredFilename(
  applicationId,
  mimeType
) {
  const extension =
    getFileExtension(mimeType);

  return [
    applicationId.toString(),
    randomUUID()
  ].join("-") + extension;
}

export async function storeDocumentFile({
  buffer,
  applicationId,
  userId,
  documentType,
  originalName,
  mimeType,
  fileHash
}) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length === 0
  ) {
    throw createServiceError(
      "Document file buffer is required",
      400
    );
  }

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

  const storedFilename =
    createStoredFilename(
      applicationObjectId,
      mimeType
    );

  const bucket = getDocumentBucket();

  const uploadStream =
    bucket.openUploadStream(
      storedFilename,
      {
        metadata: {
          applicationId:
            applicationObjectId,
          userId: userObjectId,
          documentType,
          originalName,
          mimeType,
          fileHash,
          uploadedAt: new Date()
        }
      }
    );

  try {
    await pipeline(
      Readable.from([buffer]),
      uploadStream
    );
  } catch (error) {
    throw createServiceError(
      "Unable to store document file",
      500,
      error
    );
  }

  return {
    gridFsFileId: uploadStream.id,
    storedFilename
  };
}

export async function findDocumentFile(
  fileId
) {
  const gridFsFileId =
    toObjectId(
      fileId,
      "GridFS file ID"
    );

  const files = await getDocumentBucket()
    .find({
      _id: gridFsFileId
    })
    .limit(1)
    .toArray();

  return files[0] ?? null;
}

export async function deleteDocumentFile(
  fileId
) {
  const gridFsFileId =
    toObjectId(
      fileId,
      "GridFS file ID"
    );

  try {
    await getDocumentBucket().delete(
      gridFsFileId
    );
  } catch (error) {
    throw createServiceError(
      "Unable to delete document file",
      500,
      error
    );
  }
}

mongoose.connection.on(
  "disconnected",
  () => {
    documentBucket = undefined;
  }
);