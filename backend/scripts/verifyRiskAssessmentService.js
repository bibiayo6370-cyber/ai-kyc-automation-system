import assert from "node:assert/strict";

import mongoose from "mongoose";

import connectDB from
  "../src/config/database.js";

import {
  RISK_FACTOR_CODES,
  RISK_LEVELS,
  RISK_RECOMMENDATIONS
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
  detectDuplicateIdentityDocument,
  recordRiskAssessmentFailure
} from
  "../src/services/riskAssessmentService.js";

const createdApplicationIds = [];
const createdDocumentIds = [];
const createdAssessmentIds = [];

function createApplicationData({
  userId,
  fullName,
  phoneSuffix
}) {
  return {
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
      `${phoneSuffix} Risk Test Street, Lagos`,

    phoneNumber:
      `+234809999${phoneSuffix}`,

    occupation:
      "Software Tester",

    applicationStatus:
      "pending"
  };
}

async function createApplication({
  userId,
  fullName,
  phoneSuffix
}) {
  const application =
    await KYCApplication.create(
      createApplicationData({
        userId,
        fullName,
        phoneSuffix
      })
    );

  createdApplicationIds.push(
    application._id
  );

  return application;
}

async function createDocument({
  application,
  userId,
  documentType =
  "national_id",
  fileHash,
  ocrStatus =
  "processed",
  ocrConfidence =
  95,
  verificationStatus =
  "matched",
  nameMatchScore =
  100,
  extractedText =
  "NAME LEGITIMATE TEST CUSTOMER"
}) {
  const document =
    await KYCDocument.create({
      applicationId:
        application._id,

      userId,

      gridFsFileId:
        new mongoose.Types.ObjectId(),

      documentType,

      originalName:
        `${documentType}-risk-test.png`,

      mimeType:
        "image/png",

      fileSize:
        1000,

      fileHash,

      ocrStatus,

      extractedText,

      ocrConfidence,

      verificationStatus,

      nameMatchScore
    });

  createdDocumentIds.push(
    document._id
  );

  return document;
}

function assessmentFactorCodes(
  assessment
) {
  return assessment
    .riskFactors
    .map(
      factor =>
        factor.code
    );
}

try {
  await connectDB();

  const primaryUserId =
    new mongoose.Types.ObjectId();

  const primaryApplication =
    await createApplication({
      userId:
        primaryUserId,

      fullName:
        "Legitimate Test Customer",

      phoneSuffix:
        "1001"
    });

  const primaryDocument =
    await createDocument({
      application:
        primaryApplication,

      userId:
        primaryUserId,

      fileHash:
        "a".repeat(64)
    });

  const lowAssessment =
    await assessApplicationRisk({
      applicationId:
        primaryApplication._id,

      userId:
        primaryUserId
    });

  createdAssessmentIds.push(
    lowAssessment._id
  );

  assert.equal(
    lowAssessment.riskScore,
    0
  );

  assert.equal(
    lowAssessment.riskLevel,
    RISK_LEVELS.LOW
  );

  assert.equal(
    lowAssessment.recommendation,
    RISK_RECOMMENDATIONS
      .PROCEED
  );

  assert.equal(
    lowAssessment.reviewRequired,
    false
  );

  assert.equal(
    lowAssessment
      .watchlistScreening
      .status,
    "clear"
  );

  assert.equal(
    lowAssessment
      .inputSnapshot
      .duplicateDocumentDetected,
    false
  );

  console.log(
    "Low-risk assessment orchestration verified"
  );

  primaryDocument.ocrConfidence =
    70;

  primaryDocument.verificationStatus =
    "needs_review";

  primaryDocument.nameMatchScore =
    66.67;

  await primaryDocument.save();

  const updatedAssessment =
    await assessApplicationRisk({
      applicationId:
        primaryApplication._id,

      userId:
        primaryUserId
    });

  assert.equal(
    String(
      updatedAssessment._id
    ),
    String(
      lowAssessment._id
    )
  );

  assert.equal(
    updatedAssessment.riskScore,
    35
  );

  assert.equal(
    updatedAssessment.riskLevel,
    RISK_LEVELS.MEDIUM
  );

  assert.equal(
    await RiskAssessment.countDocuments({
      applicationId:
        primaryApplication._id
    }),
    1
  );

  console.log(
    "Idempotent risk-assessment update verified"
  );

  primaryDocument.ocrConfidence =
    95;

  primaryDocument.verificationStatus =
    "matched";

  primaryDocument.nameMatchScore =
    100;

  await primaryDocument.save();

  const duplicateUserId =
    new mongoose.Types.ObjectId();

  const duplicateApplication =
    await createApplication({
      userId:
        duplicateUserId,

      fullName:
        "Duplicate Test Customer",

      phoneSuffix:
        "1002"
    });

  await createDocument({
    application:
      duplicateApplication,

    userId:
      duplicateUserId,

    fileHash:
      "a".repeat(64)
  });

  const duplicateDetected =
    await detectDuplicateIdentityDocument(
      primaryDocument
    );

  assert.equal(
    duplicateDetected,
    true
  );

  const duplicateAssessment =
    await assessApplicationRisk({
      applicationId:
        primaryApplication._id,

      userId:
        primaryUserId
    });

  assert.equal(
    duplicateAssessment.riskScore,
    40
  );

  assert.equal(
    duplicateAssessment.riskLevel,
    RISK_LEVELS.MEDIUM
  );

  assert.ok(
    assessmentFactorCodes(
      duplicateAssessment
    ).includes(
      RISK_FACTOR_CODES
        .DUPLICATE_ID_DOCUMENT
    )
  );

  assert.equal(
    duplicateAssessment
      .inputSnapshot
      .duplicateDocumentDetected,
    true
  );

  console.log(
    "Cross-customer duplicate identity-document detection verified"
  );

  const utilityUserOne =
    new mongoose.Types.ObjectId();

  const utilityApplicationOne =
    await createApplication({
      userId:
        utilityUserOne,

      fullName:
        "Utility Test Customer One",

      phoneSuffix:
        "1003"
    });

  const utilityDocumentOne =
    await createDocument({
      application:
        utilityApplicationOne,

      userId:
        utilityUserOne,

      documentType:
        "utility_bill",

      fileHash:
        "b".repeat(64),

      extractedText:
        "UTILITY TEST CUSTOMER ONE"
    });

  const utilityUserTwo =
    new mongoose.Types.ObjectId();

  const utilityApplicationTwo =
    await createApplication({
      userId:
        utilityUserTwo,

      fullName:
        "Utility Test Customer Two",

      phoneSuffix:
        "1004"
    });

  await createDocument({
    application:
      utilityApplicationTwo,

    userId:
      utilityUserTwo,

    documentType:
      "utility_bill",

    fileHash:
      "b".repeat(64),

    extractedText:
      "UTILITY TEST CUSTOMER TWO"
  });

  const utilityDuplicate =
    await detectDuplicateIdentityDocument(
      utilityDocumentOne
    );

  assert.equal(
    utilityDuplicate,
    false
  );

  const utilityAssessment =
    await assessApplicationRisk({
      applicationId:
        utilityApplicationOne._id,

      userId:
        utilityUserOne
    });

  createdAssessmentIds.push(
    utilityAssessment._id
  );

  assert.equal(
    utilityAssessment.riskScore,
    0
  );

  assert.equal(
    utilityAssessment
      .inputSnapshot
      .duplicateDocumentDetected,
    false
  );

  console.log(
    "Utility-bill duplicate exclusion verified"
  );

  const watchlistUserId =
    new mongoose.Types.ObjectId();

  const watchlistApplication =
    await createApplication({
      userId:
        watchlistUserId,

      fullName:
        "Sanctioned Test Customer",

      phoneSuffix:
        "1005"
    });

  await createDocument({
    application:
      watchlistApplication,

    userId:
      watchlistUserId,

    fileHash:
      "c".repeat(64),

    extractedText:
      "SANCTIONED TEST CUSTOMER"
  });

  const watchlistAssessment =
    await assessApplicationRisk({
      applicationId:
        watchlistApplication._id,

      userId:
        watchlistUserId
    });

  createdAssessmentIds.push(
    watchlistAssessment._id
  );

  assert.equal(
    watchlistAssessment.riskScore,
    100
  );

  assert.equal(
    watchlistAssessment.riskLevel,
    RISK_LEVELS.HIGH
  );

  assert.equal(
    watchlistAssessment
      .watchlistScreening
      .status,
    "match"
  );

  assert.equal(
    watchlistAssessment
      .watchlistScreening
      .referenceId,
    "SIM-WL-001"
  );

  console.log(
    "Simulated watchlist orchestration and override verified"
  );

  await assert.rejects(
    assessApplicationRisk({
      applicationId:
        primaryApplication._id,

      userId:
        duplicateUserId
    }),
    error =>
      error.statusCode === 404
  );

  console.log(
    "Cross-customer risk assessment denied"
  );

  await assert.rejects(
    assessApplicationRisk({
      applicationId:
        "invalid-id",

      userId:
        primaryUserId
    }),
    error =>
      error.statusCode === 400
  );

  console.log(
    "Malformed application ID rejected"
  );

  const noDocumentUserId =
    new mongoose.Types.ObjectId();

  const noDocumentApplication =
    await createApplication({
      userId:
        noDocumentUserId,

      fullName:
        "No Document Test Customer",

      phoneSuffix:
        "1006"
    });

  await assert.rejects(
    assessApplicationRisk({
      applicationId:
        noDocumentApplication._id,

      userId:
        noDocumentUserId
    }),
    error =>
      error.statusCode === 409
  );

  console.log(
    "Risk assessment without a document rejected"
  );

  const processingUserId =
    new mongoose.Types.ObjectId();

  const processingApplication =
    await createApplication({
      userId:
        processingUserId,

      fullName:
        "Processing Test Customer",

      phoneSuffix:
        "1007"
    });

  await createDocument({
    application:
      processingApplication,

    userId:
      processingUserId,

    fileHash:
      "d".repeat(64),

    ocrStatus:
      "processing",

    ocrConfidence:
      null,

    verificationStatus:
      "pending",

    nameMatchScore:
      null,

    extractedText:
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
      error.statusCode === 409
  );

  console.log(
    "Assessment during OCR processing rejected"
  );

  const failureRecord =
    await recordRiskAssessmentFailure({
      applicationId:
        primaryApplication._id,

      userId:
        primaryUserId,

      documentId:
        primaryDocument._id,

      error:
        new Error(
          "Controlled risk-assessment failure"
        )
    });

  assert.equal(
    failureRecord.assessmentStatus,
    "failed"
  );

  assert.equal(
    failureRecord.riskScore,
    null
  );

  assert.equal(
    failureRecord.assessmentError,
    "Controlled risk-assessment failure"
  );

  console.log(
    "Risk-assessment failure persistence verified"
  );

  console.log(
    "Sprint 4 risk assessment orchestration verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 4 risk assessment orchestration verification failed:",
    error
  );

  process.exitCode = 1;
} finally {
  if (
    createdAssessmentIds.length > 0
  ) {
    await RiskAssessment.deleteMany({
      _id: {
        $in:
          createdAssessmentIds
      }
    });
  }

  if (
    createdApplicationIds.length > 0
  ) {
    await RiskAssessment.deleteMany({
      applicationId: {
        $in:
          createdApplicationIds
      }
    });

    await KYCDocument.deleteMany({
      applicationId: {
        $in:
          createdApplicationIds
      }
    });

    await KYCApplication.deleteMany({
      _id: {
        $in:
          createdApplicationIds
      }
    });
  }

  console.log(
    "Temporary risk-assessment records removed"
  );

  await mongoose.disconnect();
}