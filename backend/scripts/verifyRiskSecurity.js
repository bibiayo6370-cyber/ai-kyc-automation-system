import assert from "node:assert/strict";
import {
  randomBytes
} from "node:crypto";

import mongoose from "mongoose";

import connectDB from
  "../src/config/database.js";

import {
  RISK_LEVELS,
  RISK_RECOMMENDATIONS,
  WATCHLIST_STATUSES
} from
  "../src/config/riskConstants.js";

import KYCApplication from
  "../src/models/KYCApplication.js";

import KYCDocument from
  "../src/models/KYCDocument.js";

import RiskAssessment from
  "../src/models/RiskAssessment.js";

import {
  assessApplicationRisk,
  getApplicationRiskAssessment
} from
  "../src/services/riskAssessmentService.js";

const createdApplicationIds = [];

function createUniquePhoneNumber(
  offset
) {
  const finalEightDigits =
    String(
      Date.now() + offset
    ).slice(-8);

  return `+23480${finalEightDigits}`;
}

async function createApplication({
  userId,
  fullName,
  offset
}) {
  const application =
    await KYCApplication.create({
      userId,

      fullName,

      dateOfBirth:
        new Date(
          "1990-01-01"
        ),

      gender:
        "male",

      nationality:
        "Nigerian",

      residentialAddress:
        `${offset} Risk Security Test Street, Lagos`,

      phoneNumber:
        createUniquePhoneNumber(
          offset
        ),

      occupation:
        "Software Tester",

      applicationStatus:
        "pending"
    });

  createdApplicationIds.push(
    application._id
  );

  return application;
}

async function createDocument({
  application,
  userId,
  ocrStatus =
  "processed",
  verificationStatus =
  "matched",
  extractedText =
  "SECURITY TEST CUSTOMER",
  ocrConfidence =
  95,
  nameMatchScore =
  100
}) {
  return KYCDocument.create({
    applicationId:
      application._id,

    userId,

    gridFsFileId:
      new mongoose.Types.ObjectId(),

    documentType:
      "national_id",

    originalName:
      "risk-security-test.png",

    mimeType:
      "image/png",

    fileSize:
      1200,

    fileHash:
      randomBytes(32)
        .toString("hex"),

    ocrStatus,

    extractedText,

    ocrConfidence,

    verificationStatus,

    nameMatchScore,

    processingError:
      ocrStatus === "failed"
        ? "Controlled OCR failure"
        : null
  });
}

try {
  await connectDB();

  /*
   * 1. Verify that client-controlled risk fields
   * are ignored by the assessment service.
   */
  const ownerUserId =
    new mongoose.Types.ObjectId();

  const ownerApplication =
    await createApplication({
      userId:
        ownerUserId,

      fullName:
        "Security Test Customer",

      offset:
        4001
    });

  await createDocument({
    application:
      ownerApplication,

    userId:
      ownerUserId
  });

  const serverControlledAssessment =
    await assessApplicationRisk({
      applicationId:
        ownerApplication._id,

      userId:
        ownerUserId,

      /*
       * These extra values simulate fields a
       * malicious client might attempt to submit.
       * The service accepts only applicationId
       * and userId and calculates all risk values.
       */
      riskScore: 100,
      riskLevel: "high",
      recommendation:
        "escalate",
      reviewRequired: true,
      watchlistStatus:
        "match"
    });

  assert.equal(
    serverControlledAssessment
      .riskScore,
    0
  );

  assert.equal(
    serverControlledAssessment
      .riskLevel,
    RISK_LEVELS.LOW
  );

  assert.equal(
    serverControlledAssessment
      .recommendation,
    RISK_RECOMMENDATIONS
      .PROCEED
  );

  assert.equal(
    serverControlledAssessment
      .reviewRequired,
    false
  );

  assert.equal(
    serverControlledAssessment
      .watchlistScreening
      .status,
    WATCHLIST_STATUSES.CLEAR
  );

  console.log(
    "Server-controlled risk calculation verified"
  );

  /*
   * 2. Verify idempotency and unique assessment.
   */
  const reassessment =
    await assessApplicationRisk({
      applicationId:
        ownerApplication._id,

      userId:
        ownerUserId
    });

  assert.equal(
    String(
      reassessment._id
    ),
    String(
      serverControlledAssessment._id
    )
  );

  assert.equal(
    await RiskAssessment.countDocuments({
      applicationId:
        ownerApplication._id
    }),
    1
  );

  console.log(
    "One-assessment-per-application security constraint verified"
  );

  /*
   * 3. Verify cross-customer retrieval denial.
   */
  const otherUserId =
    new mongoose.Types.ObjectId();

  await assert.rejects(
    getApplicationRiskAssessment({
      applicationId:
        ownerApplication._id,

      userId:
        otherUserId
    }),
    error =>
      error.statusCode === 404 &&
      error.message ===
      "KYC application not found"
  );

  console.log(
    "Cross-customer risk retrieval denied"
  );

  /*
   * 4. Verify cross-customer reassessment denial.
   */
  await assert.rejects(
    assessApplicationRisk({
      applicationId:
        ownerApplication._id,

      userId:
        otherUserId
    }),
    error =>
      error.statusCode === 404 &&
      error.message ===
      "KYC application not found"
  );

  console.log(
    "Cross-customer risk reassessment denied"
  );

  /*
   * 5. Verify malformed application ID.
   */
  await assert.rejects(
    getApplicationRiskAssessment({
      applicationId:
        "invalid-application-id",

      userId:
        ownerUserId
    }),
    error =>
      error.statusCode === 400
  );

  console.log(
    "Malformed risk application ID rejected"
  );

  /*
   * 6. Verify malformed user ID.
   */
  await assert.rejects(
    getApplicationRiskAssessment({
      applicationId:
        ownerApplication._id,

      userId:
        "invalid-user-id"
    }),
    error =>
      error.statusCode === 400
  );

  console.log(
    "Malformed risk user ID rejected"
  );

  /*
   * 7. Verify valid but nonexistent application.
   */
  await assert.rejects(
    getApplicationRiskAssessment({
      applicationId:
        new mongoose.Types.ObjectId(),

      userId:
        ownerUserId
    }),
    error =>
      error.statusCode === 404
  );

  console.log(
    "Nonexistent risk application rejected"
  );

  /*
   * 8. Verify assessment cannot run without
   * a submitted document.
   */
  const noDocumentUserId =
    new mongoose.Types.ObjectId();

  const noDocumentApplication =
    await createApplication({
      userId:
        noDocumentUserId,

      fullName:
        "No Document Security Customer",

      offset:
        4002
    });

  await assert.rejects(
    assessApplicationRisk({
      applicationId:
        noDocumentApplication._id,

      userId:
        noDocumentUserId
    }),
    error =>
      error.statusCode === 409 &&
      error.message ===
      "A KYC document is required before risk assessment"
  );

  console.log(
    "Risk assessment without document rejected"
  );

  /*
   * 9. Verify assessment cannot run while OCR
   * processing is incomplete.
   */
  const processingUserId =
    new mongoose.Types.ObjectId();

  const processingApplication =
    await createApplication({
      userId:
        processingUserId,

      fullName:
        "Processing Security Customer",

      offset:
        4003
    });

  await createDocument({
    application:
      processingApplication,

    userId:
      processingUserId,

    ocrStatus:
      "processing",

    verificationStatus:
      "pending",

    extractedText:
      null,

    ocrConfidence:
      null,

    nameMatchScore:
      null
  });

  await assert.rejects(
    assessApplicationRisk({
      applicationId:
        processingApplication._id,

      userId:
        processingUserId
    }),
    error =>
      error.statusCode === 409 &&
      error.message ===
      "KYC document processing is not complete"
  );

  console.log(
    "Risk assessment during OCR processing rejected"
  );

  /*
   * 10. Verify missing assessment returns 404.
   */
  const missingAssessmentUserId =
    new mongoose.Types.ObjectId();

  const missingAssessmentApplication =
    await createApplication({
      userId:
        missingAssessmentUserId,

      fullName:
        "Missing Assessment Customer",

      offset:
        4004
    });

  await assert.rejects(
    getApplicationRiskAssessment({
      applicationId:
        missingAssessmentApplication._id,

      userId:
        missingAssessmentUserId
    }),
    error =>
      error.statusCode === 404 &&
      error.message ===
      "KYC risk assessment not found"
  );

  console.log(
    "Missing risk assessment returned not found"
  );

  console.log(
    "Sprint 4 risk validation and security verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 4 risk validation and security verification failed:",
    error
  );

  process.exitCode = 1;
} finally {
  if (
    createdApplicationIds.length > 0
  ) {
    await RiskAssessment.deleteMany({
      applicationId: {
        $in:
          createdApplicationIds
      }
    }).catch(
      () => undefined
    );

    await KYCDocument.deleteMany({
      applicationId: {
        $in:
          createdApplicationIds
      }
    }).catch(
      () => undefined
    );

    await KYCApplication.deleteMany({
      _id: {
        $in:
          createdApplicationIds
      }
    }).catch(
      () => undefined
    );
  }

  console.log(
    "Temporary risk-security records removed"
  );

  await mongoose.disconnect();
}