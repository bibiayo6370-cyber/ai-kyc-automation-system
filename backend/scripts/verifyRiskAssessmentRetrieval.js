import assert from "node:assert/strict";

import mongoose from "mongoose";

import connectDB from
  "../src/config/database.js";

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

let applicationId;

try {
  await connectDB();

  const userId =
    new mongoose.Types.ObjectId();

  const phoneSuffix =
    String(
      Date.now()
    ).slice(-4);

  const application =
    await KYCApplication.create({
      userId,

      fullName:
        "Risk Retrieval Test Customer",

      dateOfBirth:
        new Date(
          "1990-01-01"
        ),

      gender:
        "male",

      nationality:
        "Nigerian",

      residentialAddress:
        "15 Risk Retrieval Test Street, Lagos",

      phoneNumber:
        `+234801234${phoneSuffix}`,

      occupation:
        "Software Tester",

      applicationStatus:
        "pending"
    });

  applicationId =
    application._id;

  const document =
    await KYCDocument.create({
      applicationId:
        application._id,

      userId,

      gridFsFileId:
        new mongoose.Types.ObjectId(),

      documentType:
        "national_id",

      originalName:
        "risk-retrieval-test.png",

      mimeType:
        "image/png",

      fileSize:
        1000,

      fileHash:
        "e".repeat(64),

      ocrStatus:
        "processed",

      extractedText:
        "RISK RETRIEVAL TEST CUSTOMER",

      ocrConfidence:
        95,

      verificationStatus:
        "matched",

      nameMatchScore:
        100
    });

  const createdAssessment =
    await assessApplicationRisk({
      applicationId:
        application._id,

      userId
    });

  assert.ok(
    createdAssessment
  );

  console.log(
    "Risk assessment test record created"
  );

  const retrievedAssessment =
    await getApplicationRiskAssessment({
      applicationId:
        application._id,

      userId
    });

  assert.equal(
    String(
      retrievedAssessment._id
    ),
    String(
      createdAssessment._id
    )
  );

  assert.equal(
    String(
      retrievedAssessment
        .applicationId
    ),
    String(
      application._id
    )
  );

  assert.equal(
    String(
      retrievedAssessment.userId
    ),
    String(userId)
  );

  assert.equal(
    String(
      retrievedAssessment.documentId
    ),
    String(document._id)
  );

  assert.equal(
    retrievedAssessment
      .assessmentStatus,
    "completed"
  );

  assert.equal(
    retrievedAssessment.riskScore,
    0
  );

  assert.equal(
    retrievedAssessment.riskLevel,
    "low"
  );

  console.log(
    "Owned customer risk assessment retrieval verified"
  );

  const differentUserId =
    new mongoose.Types.ObjectId();

  await assert.rejects(
    getApplicationRiskAssessment({
      applicationId:
        application._id,

      userId:
        differentUserId
    }),
    error =>
      error.statusCode === 404
  );

  console.log(
    "Cross-customer risk assessment retrieval denied"
  );

  await assert.rejects(
    getApplicationRiskAssessment({
      applicationId:
        "invalid-application-id",

      userId
    }),
    error =>
      error.statusCode === 400
  );

  console.log(
    "Malformed risk-assessment application ID rejected"
  );

  await RiskAssessment.deleteOne({
    applicationId:
      application._id
  });

  await assert.rejects(
    getApplicationRiskAssessment({
      applicationId:
        application._id,

      userId
    }),
    error =>
      error.statusCode === 404
  );

  console.log(
    "Missing risk assessment returned not found"
  );

  console.log(
    "Sprint 4 risk assessment retrieval verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 4 risk assessment retrieval verification failed:",
    error
  );

  process.exitCode = 1;
} finally {
  if (applicationId) {
    await RiskAssessment.deleteMany({
      applicationId
    }).catch(() => undefined);

    await KYCDocument.deleteMany({
      applicationId
    }).catch(() => undefined);

    await KYCApplication
      .findByIdAndDelete(
        applicationId
      )
      .catch(() => undefined);
  }

  console.log(
    "Temporary risk-retrieval records removed"
  );

  await mongoose.disconnect();
}