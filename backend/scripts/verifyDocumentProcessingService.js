import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";

import connectDB from "../src/config/database.js";
import { APPLICATION_STATUSES } from "../src/config/kycReviewConstants.js";
import { AUDIT_ACTIONS } from "../src/config/auditLogConstants.js";

import KYCApplication from "../src/models/KYCApplication.js";
import KYCDocument from "../src/models/KYCDocument.js";
import RiskAssessment from "../src/models/RiskAssessment.js";
import AuditLog from "../src/models/AuditLog.js";

import { processKYCDocument } from "../src/services/kycDocumentService.js";
import {
  findDocumentFile,
  deleteDocumentFile
} from "../src/services/gridFsService.js";
import { terminateOcrWorker } from "../src/services/ocrService.js";

const applicationIds = [];
let primaryApplicationId = null;

try {
  await connectDB();

  const userId = new mongoose.Types.ObjectId();

  const application = await KYCApplication.create({
    userId,
    fullName: "Test Customer",
    dateOfBirth: new Date("1990-01-01"),
    gender: "male",
    nationality: "Nigerian",
    residentialAddress: "1 Test Street, Lagos",
    phoneNumber: "+2348090000000",
    occupation: "Software Tester",
    applicationStatus: APPLICATION_STATUSES.PENDING
  });

  primaryApplicationId = application._id;
  applicationIds.push(application._id);

  console.log("Temporary KYC application created successfully");

  const imageUrl = new URL(
    "../tests/fixtures/ocr-test-document.png",
    import.meta.url
  );

  const imageBuffer = await readFile(imageUrl);

  const uploadedFile = {
    buffer: imageBuffer,
    originalname: "ocr-test-document.png",
    mimetype: "image/png",
    size: imageBuffer.length
  };

  const { document, riskAssessment } = await processKYCDocument({
    applicationId: application._id,
    userId,
    file: uploadedFile,
    documentType: "national_id"
  });

  assert.equal(
    document.applicationId.toString(),
    application._id.toString()
  );

  assert.equal(document.userId.toString(), userId.toString());
  assert.equal(document.documentType, "national_id");
  assert.equal(document.mimeType, "image/png");
  assert.equal(document.fileSize, imageBuffer.length);
  assert.match(document.fileHash, /^[a-f0-9]{64}$/);
  assert.equal(document.ocrStatus, "processed");
  assert.equal(document.verificationStatus, "matched");
  assert.equal(document.nameMatchScore, 100);

  console.log("OCR customer-name verification completed successfully");

  assert.ok(
    document.extractedText?.toUpperCase().includes("KYC"),
    "Expected OCR text was not stored"
  );

  assert.ok(
    document.ocrConfidence >= 0 && document.ocrConfidence <= 100,
    "OCR confidence is outside the valid range"
  );

  console.log("KYC document processed and stored successfully");
  console.log(`OCR confidence: ${document.ocrConfidence}`);
  console.log("Extracted text:");
  console.log(document.extractedText);

  const gridFsFile = await findDocumentFile(document.gridFsFileId);

  assert.ok(gridFsFile, "Stored GridFS document was not found");

  assert.equal(
    gridFsFile.metadata.applicationId.toString(),
    application._id.toString()
  );

  assert.equal(
    gridFsFile.metadata.userId.toString(),
    userId.toString()
  );

  assert.equal(gridFsFile.metadata.fileHash, document.fileHash);

  console.log("GridFS file and document metadata relationship verified");

  assert.ok(riskAssessment);

  assert.equal(
    String(riskAssessment.applicationId),
    String(document.applicationId)
  );

  assert.equal(
    String(riskAssessment.documentId),
    String(document._id)
  );

  console.log("Automatic risk assessment after document processing verified");

  const transitionedApplication = await KYCApplication.findById(
    application._id
  );

  assert.ok(
    transitionedApplication,
    "Transitioned KYC application was not found"
  );

  assert.equal(
    transitionedApplication.applicationStatus,
    APPLICATION_STATUSES.UNDER_REVIEW
  );

  assert.equal(transitionedApplication.reviewedBy, null);
  assert.equal(transitionedApplication.reviewDate, null);
  assert.equal(transitionedApplication.reviewComments, null);

  const transitionAudit = await AuditLog.findOne({
    applicationId: application._id,
    action: AUDIT_ACTIONS.APPLICATION_MOVED_TO_REVIEW
  });

  assert.ok(
    transitionAudit,
    "Automatic review-transition audit was not created"
  );

  assert.equal(
    String(transitionAudit.riskAssessmentId),
    String(riskAssessment._id)
  );

  console.log("Application transitioned to under-review after assessment");
  console.log("Automatic review-transition audit verified");

  /*
   * Once the first document has completed processing,
   * the application is under review and no additional
   * document upload is permitted.
   */
  await assert.rejects(
    () =>
      processKYCDocument({
        applicationId: application._id,
        userId,
        file: uploadedFile,
        documentType: "passport"
      }),
    error =>
      error.statusCode === 409 &&
      error.message ===
      "Documents can only be uploaded while the KYC application is pending"
  );

  console.log("Document upload blocked after application entered review");

  /*
   * Independently verify the one-document-per-application
   * rule while the application is still pending.
   *
   * The customer has already selected national_id, so an
   * attempted passport upload must still be rejected.
   */
  const existingDocumentUserId = new mongoose.Types.ObjectId();

  const existingDocumentApplication = await KYCApplication.create({
    userId: existingDocumentUserId,
    fullName: "Existing Document Test Customer",
    dateOfBirth: new Date("1990-01-01"),
    gender: "male",
    nationality: "Nigerian",
    residentialAddress: "2 Test Street, Lagos",
    phoneNumber: "+2348090000001",
    occupation: "Software Tester",
    applicationStatus: APPLICATION_STATUSES.PENDING
  });

  applicationIds.push(existingDocumentApplication._id);

  await KYCDocument.create({
    applicationId: existingDocumentApplication._id,
    userId: existingDocumentUserId,
    gridFsFileId: new mongoose.Types.ObjectId(),
    documentType: "national_id",
    originalName: "existing-national-id.png",
    mimeType: "image/png",
    fileSize: 1200,
    fileHash: "b".repeat(64),
    ocrStatus: "processed",
    extractedText: "EXISTING NATIONAL ID DOCUMENT",
    ocrConfidence: 95,
    verificationStatus: "matched",
    nameMatchScore: 100,
    processingError: null
  });

  await assert.rejects(
    () =>
      processKYCDocument({
        applicationId: existingDocumentApplication._id,
        userId: existingDocumentUserId,
        file: uploadedFile,
        documentType: "passport"
      }),
    error =>
      error.statusCode === 409 &&
      error.message ===
      "A document has already been uploaded for this KYC application"
  );

  console.log("One-document-per-application restriction verified");
  console.log("Sprint 3 document processing service verification passed");
} catch (error) {
  console.error(
    "Sprint 3 document processing service verification failed:",
    error
  );

  process.exitCode = 1;
} finally {
  if (primaryApplicationId) {
    const storedDocument = await KYCDocument.findOne({
      applicationId: primaryApplicationId
    }).catch(() => null);

    if (storedDocument?.gridFsFileId) {
      try {
        await deleteDocumentFile(storedDocument.gridFsFileId);
      } catch (error) {
        console.error(
          "GridFS verification cleanup failed:",
          error.message
        );
      }
    }
  }

  if (applicationIds.length > 0) {
    await AuditLog.collection.deleteMany({
      applicationId: { $in: applicationIds }
    }).catch(() => undefined);

    await RiskAssessment.deleteMany({
      applicationId: { $in: applicationIds }
    }).catch(() => undefined);

    await KYCDocument.deleteMany({
      applicationId: { $in: applicationIds }
    }).catch(() => undefined);

    await KYCApplication.deleteMany({
      _id: { $in: applicationIds }
    }).catch(() => undefined);

    console.log("Temporary verification records removed");
  }

  await terminateOcrWorker();
  await mongoose.disconnect();
}