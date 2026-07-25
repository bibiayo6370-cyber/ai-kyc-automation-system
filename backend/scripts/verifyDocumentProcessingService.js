import assert from "node:assert/strict";

import {
  readFile
} from "node:fs/promises";

import mongoose from "mongoose";

import connectDB from
  "../src/config/database.js";

import KYCApplication from
  "../src/models/KYCApplication.js";

import KYCDocument from
  "../src/models/KYCDocument.js";

import {
  processKYCDocument
} from
  "../src/services/kycDocumentService.js";

import {
  findDocumentFile,
  deleteDocumentFile
} from
  "../src/services/gridFsService.js";

import {
  terminateOcrWorker
} from
  "../src/services/ocrService.js";

let applicationId;

try {
  await connectDB();

  const userId =
    new mongoose.Types.ObjectId();

  const application =
    await KYCApplication.create({
      userId,

      fullName:
        "Test Customer",

      dateOfBirth:
        new Date("1990-01-01"),

      gender:
        "male",

      nationality:
        "Nigerian",

      residentialAddress:
        "1 Test Street, Lagos",

      phoneNumber:
        "+2348090000000",

      occupation:
        "Software Tester",

      applicationStatus:
        "pending"
    });

  applicationId =
    application._id;

  console.log(
    "Temporary KYC application created successfully"
  );

  const imageUrl =
    new URL(
      "../tests/fixtures/ocr-test-document.png",
      import.meta.url
    );

  const imageBuffer =
    await readFile(imageUrl);

  const uploadedFile = {
    buffer: imageBuffer,
    originalname:
      "ocr-test-document.png",
    mimetype:
      "image/png",
    size:
      imageBuffer.length
  };

  const {
    document,
    riskAssessment
  } =
    await processKYCDocument({
      applicationId:
        application._id,

      userId,

      file:
        uploadedFile,

      documentType:
        "national_id"
    });

  assert.equal(
    document.applicationId.toString(),
    application._id.toString()
  );

  assert.equal(
    document.userId.toString(),
    userId.toString()
  );

  assert.equal(
    document.documentType,
    "national_id"
  );

  assert.equal(
    document.mimeType,
    "image/png"
  );

  assert.equal(
    document.fileSize,
    imageBuffer.length
  );

  assert.match(
    document.fileHash,
    /^[a-f0-9]{64}$/
  );

  assert.equal(
    document.ocrStatus,
    "processed"
  );

  /*  assert.equal(
     document.verificationStatus,
     "pending"
   ); */

  assert.equal(
    document.verificationStatus,
    "matched"
  );

  assert.equal(
    document.nameMatchScore,
    100
  );

  console.log(
    "OCR customer-name verification completed successfully"
  );

  assert.ok(
    document.extractedText
      ?.toUpperCase()
      .includes("KYC"),
    "Expected OCR text was not stored"
  );

  assert.ok(
    document.ocrConfidence >= 0 &&
    document.ocrConfidence <= 100,
    "OCR confidence is outside the valid range"
  );

  console.log(
    "KYC document processed and stored successfully"
  );

  console.log(
    `OCR confidence: ${document.ocrConfidence}`
  );

  console.log(
    "Extracted text:"
  );

  console.log(
    document.extractedText
  );

  const gridFsFile =
    await findDocumentFile(
      document.gridFsFileId
    );

  assert.ok(
    gridFsFile,
    "Stored GridFS document was not found"
  );

  assert.equal(
    gridFsFile.metadata
      .applicationId
      .toString(),
    application._id.toString()
  );

  assert.equal(
    gridFsFile.metadata
      .userId
      .toString(),
    userId.toString()
  );

  assert.equal(
    gridFsFile.metadata.fileHash,
    document.fileHash
  );

  console.log(
    "GridFS file and document metadata relationship verified"
  );

  await assert.rejects(
    () =>
      processKYCDocument({
        applicationId:
          application._id,

        userId,

        file:
          uploadedFile,

        documentType:
          "passport"
      }),

    (error) =>
      error.statusCode === 409 &&
      error.message ===
      "A document has already been uploaded for this KYC application"
  );

  console.log(
    "One-document-per-application restriction verified"
  );

  assert.ok(
    riskAssessment
  );

  assert.equal(
    String(
      riskAssessment.applicationId
    ),
    String(
      document.applicationId
    )
  );

  assert.equal(
    String(
      riskAssessment.documentId
    ),
    String(
      document._id
    )
  );

  console.log(
    "Automatic risk assessment after document processing verified"
  );

  console.log(
    "Sprint 3 document processing service verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 3 document processing service verification failed:",
    error
  );

  process.exitCode = 1;
} finally {
  if (applicationId) {
    const document =
      await KYCDocument.findOne({
        applicationId
      });

    if (document?.gridFsFileId) {
      try {
        await deleteDocumentFile(
          document.gridFsFileId
        );
      } catch (error) {
        console.error(
          "GridFS verification cleanup failed:",
          error.message
        );
      }
    }

    await KYCDocument.deleteMany({
      applicationId
    });

    await KYCApplication.findByIdAndDelete(
      applicationId
    );

    console.log(
      "Temporary verification records removed"
    );
  }

  await terminateOcrWorker();

  await mongoose.disconnect();
}