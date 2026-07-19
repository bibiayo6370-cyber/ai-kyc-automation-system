import assert from "node:assert/strict";
import {
  createHash
} from "node:crypto";

import mongoose from "mongoose";

import connectDB from
  "../src/config/database.js";

import {
  storeDocumentFile,
  findDocumentFile,
  deleteDocumentFile
} from
  "../src/services/gridFsService.js";

let uploadedFileId;

try {
  await connectDB();

  const buffer = Buffer.from(
    "Sprint 3 GridFS storage verification"
  );

  const fileHash = createHash("sha256")
    .update(buffer)
    .digest("hex");

  const applicationId =
    new mongoose.Types.ObjectId();

  const userId =
    new mongoose.Types.ObjectId();

  const storedFile =
    await storeDocumentFile({
      buffer,
      applicationId,
      userId,
      documentType: "national_id",
      originalName:
        "gridfs-verification.png",
      mimeType: "image/png",
      fileHash
    });

  uploadedFileId =
    storedFile.gridFsFileId;

  assert.ok(
    uploadedFileId,
    "GridFS file ID was not returned"
  );

  console.log(
    "Document stored in GridFS successfully"
  );

  const fileMetadata =
    await findDocumentFile(
      uploadedFileId
    );

  assert.ok(
    fileMetadata,
    "Stored GridFS file was not found"
  );

  assert.equal(
    fileMetadata.length,
    buffer.length
  );

  assert.equal(
    fileMetadata.metadata
      .applicationId
      .toString(),
    applicationId.toString()
  );

  assert.equal(
    fileMetadata.metadata
      .userId
      .toString(),
    userId.toString()
  );

  assert.equal(
    fileMetadata.metadata.documentType,
    "national_id"
  );

  assert.equal(
    fileMetadata.metadata.fileHash,
    fileHash
  );

  console.log(
    "GridFS document metadata verified successfully"
  );

  await deleteDocumentFile(
    uploadedFileId
  );

  uploadedFileId = undefined;

  const deletedFile =
    await findDocumentFile(
      storedFile.gridFsFileId
    );

  assert.equal(
    deletedFile,
    null
  );

  console.log(
    "GridFS test document deleted successfully"
  );

  console.log(
    "Sprint 3 GridFS verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 3 GridFS verification failed:",
    error
  );

  process.exitCode = 1;
} finally {
  if (uploadedFileId) {
    try {
      await deleteDocumentFile(
        uploadedFileId
      );
    } catch (cleanupError) {
      console.error(
        "GridFS cleanup failed:",
        cleanupError.message
      );
    }
  }

  await mongoose.disconnect();
}