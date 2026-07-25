import assert from "node:assert/strict";
import {
  randomBytes
} from "node:crypto";

import mongoose from "mongoose";

import connectDB from
  "../src/config/database.js";

import {
  ASSESSMENT_STATUSES,
  RISK_FACTOR_CODES,
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

function getFactorCodes(
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

  const userId =
    new mongoose.Types.ObjectId();

  const application =
    await KYCApplication.create({
      userId,

      fullName:
        "Medium Risk Evaluation Customer",

      dateOfBirth:
        new Date(
          "1990-01-01"
        ),

      gender:
        "male",

      nationality:
        "Nigerian",

      residentialAddress:
        "25 Medium Risk Evaluation Street, Lagos",

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
        "medium-risk-evaluation.png",

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
        "FULL NAME MEDIUM RISK CUSTOMER",

      ocrConfidence:
        70,

      verificationStatus:
        "needs_review",

      nameMatchScore:
        66.67,

      processingError:
        null
    });

  console.log(
    "Medium-risk KYC application and document fixture created"
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
    35
  );

  assert.equal(
    assessment.riskLevel,
    RISK_LEVELS.MEDIUM
  );

  assert.equal(
    assessment.recommendation,
    RISK_RECOMMENDATIONS
      .MANUAL_REVIEW
  );

  assert.equal(
    assessment.reviewRequired,
    true
  );

  console.log(
    "Medium-risk score, level and recommendation verified"
  );

  const factorCodes =
    getFactorCodes(
      assessment
    );

  assert.deepEqual(
    factorCodes,
    [
      RISK_FACTOR_CODES
        .OCR_CONFIDENCE_LOW,

      RISK_FACTOR_CODES
        .NAME_PARTIAL_MATCH
    ]
  );

  assert.equal(
    assessment.riskFactors.length,
    2
  );

  assert.equal(
    assessment
      .riskFactors[0]
      .scoreImpact,
    15
  );

  assert.equal(
    assessment
      .riskFactors[1]
      .scoreImpact,
    20
  );

  assert.equal(
    assessment
      .riskFactors
      .reduce(
        (
          total,
          factor
        ) =>
          total +
          factor.scoreImpact,
        0
      ),
    35
  );

  console.log(
    "Medium-risk factor weights and additive score verified"
  );

  assert.deepEqual(
    assessment.assessmentReasons,
    [
      "OCR confidence was between 50 and 74.99 percent",
      "The customer name was only partially matched in the document"
    ]
  );

  console.log(
    "Medium-risk assessment reasons verified"
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
    70
  );

  assert.equal(
    assessment
      .inputSnapshot
      .verificationStatus,
    "needs_review"
  );

  assert.equal(
    assessment
      .inputSnapshot
      .nameMatchScore,
    66.67
  );

  assert.equal(
    assessment
      .inputSnapshot
      .duplicateDocumentDetected,
    false
  );

  console.log(
    "Medium-risk input snapshot verified"
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
    "Medium-risk assessment relationships and uniqueness verified"
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
    35
  );

  assert.equal(
    retrievedAssessment.riskLevel,
    RISK_LEVELS.MEDIUM
  );

  assert.equal(
    retrievedAssessment
      .recommendation,
    RISK_RECOMMENDATIONS
      .MANUAL_REVIEW
  );

  assert.equal(
    retrievedAssessment
      .reviewRequired,
    true
  );

  console.log(
    "Medium-risk customer assessment retrieval verified"
  );

  console.log(
    "Sprint 4 medium-risk scenario verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 4 medium-risk scenario verification failed:",
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
    "Temporary medium-risk scenario records removed"
  );

  await mongoose.disconnect();
}