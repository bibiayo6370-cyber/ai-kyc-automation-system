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
  assessApplicationRisk
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
        `${offset} High Risk Test Street, Lagos`,

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
  ocrStatus,
  extractedText,
  ocrConfidence,
  verificationStatus,
  nameMatchScore,
  filePrefix
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
      `${filePrefix}.png`,

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
        ? "Controlled OCR processing failure"
        : null
  });
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

  /*
   * Scenario 1:
   * Successful OCR with total name mismatch.
   */
  const mismatchUserId =
    new mongoose.Types.ObjectId();

  const mismatchApplication =
    await createApplication({
      userId:
        mismatchUserId,

      fullName:
        "High Risk Evaluation Customer",

      offset:
        3001
    });

  await createDocument({
    application:
      mismatchApplication,

    userId:
      mismatchUserId,

    ocrStatus:
      "processed",

    extractedText:
      "FULL NAME COMPLETELY DIFFERENT PERSON",

    ocrConfidence:
      95,

    verificationStatus:
      "needs_review",

    nameMatchScore:
      0,

    filePrefix:
      "high-risk-name-mismatch"
  });

  const mismatchAssessment =
    await assessApplicationRisk({
      applicationId:
        mismatchApplication._id,

      userId:
        mismatchUserId
    });

  assert.equal(
    mismatchAssessment
      .assessmentStatus,
    ASSESSMENT_STATUSES
      .COMPLETED
  );

  assert.equal(
    mismatchAssessment.riskScore,
    60
  );

  assert.equal(
    mismatchAssessment.riskLevel,
    RISK_LEVELS.HIGH
  );

  assert.equal(
    mismatchAssessment
      .recommendation,
    RISK_RECOMMENDATIONS
      .ESCALATE
  );

  assert.equal(
    mismatchAssessment
      .reviewRequired,
    true
  );

  assert.deepEqual(
    getFactorCodes(
      mismatchAssessment
    ),
    [
      RISK_FACTOR_CODES
        .NAME_NO_MATCH
    ]
  );

  assert.equal(
    mismatchAssessment
      .riskFactors[0]
      .scoreImpact,
    60
  );

  assert.equal(
    mismatchAssessment
      .inputSnapshot
      .nameMatchScore,
    0
  );

  console.log(
    "High-risk total name-mismatch scenario verified"
  );

  /*
   * Scenario 2:
   * OCR failure with no dependent name penalty.
   */
  const ocrFailureUserId =
    new mongoose.Types.ObjectId();

  const ocrFailureApplication =
    await createApplication({
      userId:
        ocrFailureUserId,

      fullName:
        "OCR Failure Evaluation Customer",

      offset:
        3002
    });

  await createDocument({
    application:
      ocrFailureApplication,

    userId:
      ocrFailureUserId,

    ocrStatus:
      "failed",

    extractedText:
      null,

    ocrConfidence:
      null,

    verificationStatus:
      "failed",

    nameMatchScore:
      null,

    filePrefix:
      "high-risk-ocr-failure"
  });

  const ocrFailureAssessment =
    await assessApplicationRisk({
      applicationId:
        ocrFailureApplication._id,

      userId:
        ocrFailureUserId
    });

  assert.equal(
    ocrFailureAssessment
      .riskScore,
    60
  );

  assert.equal(
    ocrFailureAssessment
      .riskLevel,
    RISK_LEVELS.HIGH
  );

  assert.equal(
    ocrFailureAssessment
      .recommendation,
    RISK_RECOMMENDATIONS
      .ESCALATE
  );

  assert.equal(
    ocrFailureAssessment
      .reviewRequired,
    true
  );

  assert.deepEqual(
    getFactorCodes(
      ocrFailureAssessment
    ),
    [
      RISK_FACTOR_CODES
        .OCR_FAILED
    ]
  );

  assert.ok(
    !getFactorCodes(
      ocrFailureAssessment
    ).includes(
      RISK_FACTOR_CODES
        .NAME_VERIFICATION_FAILED
    )
  );

  assert.equal(
    ocrFailureAssessment
      .inputSnapshot
      .ocrStatus,
    "failed"
  );

  assert.equal(
    ocrFailureAssessment
      .inputSnapshot
      .extractedTextPresent,
    false
  );

  console.log(
    "High-risk OCR-failure scenario verified without double penalty"
  );

  /*
   * Scenario 3:
   * Simulated watchlist match and score override.
   */
  const watchlistUserId =
    new mongoose.Types.ObjectId();

  const watchlistApplication =
    await createApplication({
      userId:
        watchlistUserId,

      fullName:
        "Sanctioned Test Customer",

      offset:
        3003
    });

  await createDocument({
    application:
      watchlistApplication,

    userId:
      watchlistUserId,

    ocrStatus:
      "processed",

    extractedText:
      "FULL NAME SANCTIONED TEST CUSTOMER",

    ocrConfidence:
      95,

    verificationStatus:
      "matched",

    nameMatchScore:
      100,

    filePrefix:
      "high-risk-watchlist-match"
  });

  const watchlistAssessment =
    await assessApplicationRisk({
      applicationId:
        watchlistApplication._id,

      userId:
        watchlistUserId
    });

  assert.equal(
    watchlistAssessment
      .assessmentStatus,
    ASSESSMENT_STATUSES
      .COMPLETED
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
      .recommendation,
    RISK_RECOMMENDATIONS
      .ESCALATE
  );

  assert.equal(
    watchlistAssessment
      .reviewRequired,
    true
  );

  assert.ok(
    getFactorCodes(
      watchlistAssessment
    ).includes(
      RISK_FACTOR_CODES
        .WATCHLIST_MATCH
    )
  );

  const watchlistFactor =
    watchlistAssessment
      .riskFactors
      .find(
        factor =>
          factor.code ===
          RISK_FACTOR_CODES
            .WATCHLIST_MATCH
      );

  assert.ok(
    watchlistFactor,
    "Watchlist factor was not stored"
  );

  assert.equal(
    watchlistFactor
      .scoreImpact,
    100
  );

  assert.equal(
    watchlistFactor
      .isOverride,
    true
  );

  assert.equal(
    watchlistAssessment
      .watchlistScreening
      .status,
    WATCHLIST_STATUSES.MATCH
  );

  assert.equal(
    watchlistAssessment
      .watchlistScreening
      .referenceId,
    "SIM-WL-001"
  );

  assert.equal(
    watchlistAssessment
      .watchlistScreening
      .matchedName,
    "Sanctioned Test Customer"
  );

  assert.equal(
    watchlistAssessment
      .watchlistScreening
      .simulated,
    true
  );

  assert.ok(
    watchlistAssessment
      .watchlistScreening
      .screenedAt
  );

  console.log(
    "Critical simulated watchlist match and score override verified"
  );

  /*
   * Confirm one stored assessment per scenario.
   */
  for (
    const applicationId of
    createdApplicationIds
  ) {
    assert.equal(
      await RiskAssessment
        .countDocuments({
          applicationId
        }),
      1
    );
  }

  console.log(
    "High-risk assessment relationships and uniqueness verified"
  );

  console.log(
    "Sprint 4 high-risk and watchlist scenario verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 4 high-risk and watchlist scenario verification failed:",
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
    "Temporary high-risk scenario records removed"
  );

  await mongoose.disconnect();
}