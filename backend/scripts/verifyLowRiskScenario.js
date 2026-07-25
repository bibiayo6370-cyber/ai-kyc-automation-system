import assert from "node:assert/strict";
import {
  randomBytes
} from "node:crypto";

import mongoose from "mongoose";

import connectDB from
  "../src/config/database.js";

import {
  ASSESSMENT_STATUSES,
  RISK_LEVELS,
  RISK_RECOMMENDATIONS,
  RISK_RULES_VERSION,
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

let applicationId;

function createUniquePhoneNumber() {
  const finalEightDigits =
    String(Date.now())
      .slice(-8);

  return `+23480${finalEightDigits}`;
}

try {
  await connectDB();

  const userId =
    new mongoose.Types.ObjectId();

  const application =
    await KYCApplication.create({
      userId,

      fullName:
        "Low Risk Evaluation Customer",

      dateOfBirth:
        new Date(
          "1990-01-01"
        ),

      gender:
        "male",

      nationality:
        "Nigerian",

      residentialAddress:
        "20 Low Risk Evaluation Street, Lagos",

      phoneNumber:
        createUniquePhoneNumber(),

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
        "low-risk-evaluation.png",

      mimeType:
        "image/png",

      fileSize:
        1200,

      fileHash:
        randomBytes(32)
          .toString("hex"),

      ocrStatus:
        "processed",

      extractedText:
        "FULL NAME LOW RISK EVALUATION CUSTOMER",

      ocrConfidence:
        95,

      verificationStatus:
        "matched",

      nameMatchScore:
        100,

      processingError:
        null
    });

  console.log(
    "Low-risk KYC application and document fixture created"
  );

  const assessment =
    await assessApplicationRisk({
      applicationId:
        application._id,

      userId
    });

  assert.ok(
    assessment,
    "Risk assessment was not created"
  );

  assert.equal(
    assessment.assessmentStatus,
    ASSESSMENT_STATUSES.COMPLETED
  );

  assert.equal(
    assessment.riskScore,
    0
  );

  assert.equal(
    assessment.riskLevel,
    RISK_LEVELS.LOW
  );

  assert.equal(
    assessment.recommendation,
    RISK_RECOMMENDATIONS.PROCEED
  );

  assert.equal(
    assessment.reviewRequired,
    false
  );

  console.log(
    "Low-risk score, level and recommendation verified"
  );

  assert.equal(
    assessment.riskFactors.length,
    0
  );

  assert.deepEqual(
    assessment.assessmentReasons,
    [
      "No material KYC risk factors were detected"
    ]
  );

  console.log(
    "No material risk factors detected"
  );

  assert.equal(
    assessment
      .watchlistScreening
      .status,
    WATCHLIST_STATUSES.CLEAR
  );

  assert.equal(
    assessment
      .watchlistScreening
      .referenceId,
    null
  );

  assert.equal(
    assessment
      .watchlistScreening
      .matchedName,
    null
  );

  assert.equal(
    assessment
      .watchlistScreening
      .simulated,
    true
  );

  assert.ok(
    assessment
      .watchlistScreening
      .screenedAt
  );

  console.log(
    "Clear simulated watchlist result verified"
  );

  assert.ok(
    assessment.inputSnapshot,
    "Assessment input snapshot was not stored"
  );

  assert.equal(
    assessment
      .inputSnapshot
      .documentType,
    "national_id"
  );

  assert.equal(
    assessment
      .inputSnapshot
      .ocrStatus,
    "processed"
  );

  assert.equal(
    assessment
      .inputSnapshot
      .extractedTextPresent,
    true
  );

  assert.equal(
    assessment
      .inputSnapshot
      .ocrConfidence,
    95
  );

  assert.equal(
    assessment
      .inputSnapshot
      .verificationStatus,
    "matched"
  );

  assert.equal(
    assessment
      .inputSnapshot
      .nameMatchScore,
    100
  );

  assert.equal(
    assessment
      .inputSnapshot
      .duplicateDocumentDetected,
    false
  );

  console.log(
    "Low-risk input snapshot verified"
  );

  assert.equal(
    assessment.rulesVersion,
    RISK_RULES_VERSION
  );

  assert.equal(
    assessment.assessmentError,
    null
  );

  assert.ok(
    assessment.assessedAt
  );

  console.log(
    "Rules version and assessment completion data verified"
  );

  assert.equal(
    String(
      assessment.applicationId
    ),
    String(
      application._id
    )
  );

  assert.equal(
    String(
      assessment.userId
    ),
    String(userId)
  );

  assert.equal(
    String(
      assessment.documentId
    ),
    String(
      document._id
    )
  );

  assert.equal(
    await RiskAssessment.countDocuments({
      applicationId:
        application._id
    }),
    1
  );

  console.log(
    "Low-risk assessment relationships and uniqueness verified"
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
      assessment._id
    )
  );

  assert.equal(
    retrievedAssessment.riskScore,
    0
  );

  assert.equal(
    retrievedAssessment.riskLevel,
    RISK_LEVELS.LOW
  );

  console.log(
    "Low-risk customer assessment retrieval verified"
  );

  console.log(
    "Sprint 4 low-risk scenario verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 4 low-risk scenario verification failed:",
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
    "Temporary low-risk scenario records removed"
  );

  await mongoose.disconnect();
}