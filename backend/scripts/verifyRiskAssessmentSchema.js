import assert from "node:assert/strict";

import mongoose from "mongoose";

import {
  ASSESSMENT_STATUSES,
  RISK_FACTOR_CATEGORIES,
  RISK_FACTOR_CODES,
  RISK_FACTOR_SEVERITIES,
  RISK_LEVELS,
  RISK_RECOMMENDATIONS,
  RISK_RULES_VERSION,
  WATCHLIST_STATUSES
} from
  "../src/config/riskConstants.js";

import RiskAssessment from
  "../src/models/RiskAssessment.js";

function createBaseAssessment() {
  return {
    applicationId:
      new mongoose.Types.ObjectId(),

    userId:
      new mongoose.Types.ObjectId(),

    documentId:
      new mongoose.Types.ObjectId(),

    assessmentStatus:
      ASSESSMENT_STATUSES
        .COMPLETED,

    riskScore: 0,

    riskLevel:
      RISK_LEVELS.LOW,

    recommendation:
      RISK_RECOMMENDATIONS
        .PROCEED,

    reviewRequired: false,

    riskFactors: [],

    assessmentReasons: [
      "No material KYC risk factors were detected"
    ],

    watchlistScreening: {
      status:
        WATCHLIST_STATUSES.CLEAR,

      referenceId: null,

      matchedName: null,

      simulated: true,

      screenedAt: new Date()
    },

    inputSnapshot: {
      documentType:
        "national_id",

      ocrStatus:
        "processed",

      extractedTextPresent:
        true,

      ocrConfidence:
        95,

      verificationStatus:
        "matched",

      nameMatchScore:
        100,

      duplicateDocumentDetected:
        false
    },

    rulesVersion:
      RISK_RULES_VERSION,

    assessmentError:
      null,

    assessedAt:
      new Date()
  };
}

try {
  const assessment =
    new RiskAssessment(
      createBaseAssessment()
    );

  await assessment.validate();

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
    RISK_RECOMMENDATIONS
      .PROCEED
  );

  assert.equal(
    assessment.reviewRequired,
    false
  );

  assert.equal(
    assessment.rulesVersion,
    "1.0"
  );

  console.log(
    "Valid completed risk assessment schema verified"
  );

  const assessmentIndexes =
    RiskAssessment.schema.indexes();

  const applicationIndex =
    assessmentIndexes.find(
      ([fields]) =>
        fields.applicationId === 1
    );

  assert.ok(
    applicationIndex,
    "Application index was not defined"
  );

  assert.equal(
    applicationIndex[1].unique,
    true
  );

  console.log(
    "One-assessment-per-application constraint verified"
  );

  const userIndex =
    assessmentIndexes.find(
      ([fields]) =>
        fields.userId === 1
    );

  const documentIndex =
    assessmentIndexes.find(
      ([fields]) =>
        fields.documentId === 1
    );

  assert.ok(userIndex);
  assert.ok(documentIndex);

  console.log(
    "Risk assessment ownership indexes verified"
  );

  const mediumAssessment =
    new RiskAssessment({
      ...createBaseAssessment(),

      riskScore: 35,

      riskLevel:
        RISK_LEVELS.MEDIUM,

      recommendation:
        RISK_RECOMMENDATIONS
          .MANUAL_REVIEW,

      reviewRequired: true,

      riskFactors: [
        {
          code:
            RISK_FACTOR_CODES
              .OCR_CONFIDENCE_LOW,

          category:
            RISK_FACTOR_CATEGORIES
              .DOCUMENT_QUALITY,

          description:
            "OCR confidence was between 50 and 74.99 percent",

          scoreImpact: 15,

          observedValue: "70",

          severity:
            RISK_FACTOR_SEVERITIES
              .MEDIUM,

          isOverride: false
        },

        {
          code:
            RISK_FACTOR_CODES
              .NAME_PARTIAL_MATCH,

          category:
            RISK_FACTOR_CATEGORIES
              .IDENTITY_MATCH,

          description:
            "The customer name was only partially matched in the document",

          scoreImpact: 20,

          observedValue:
            "66.67",

          severity:
            RISK_FACTOR_SEVERITIES
              .MEDIUM,

          isOverride: false
        }
      ]
    });

  await mediumAssessment.validate();

  assert.equal(
    mediumAssessment
      .riskFactors.length,
    2
  );

  assert.equal(
    mediumAssessment.riskScore,
    35
  );

  console.log(
    "Structured risk-factor storage verified"
  );

  const excessiveScore =
    new RiskAssessment({
      ...createBaseAssessment(),
      riskScore: 101
    });

  await assert.rejects(
    excessiveScore.validate(),
    /maximum allowed value|Risk level does not match|riskScore/i
  );

  console.log(
    "Risk score boundary validation verified"
  );

  const inconsistentLevel =
    new RiskAssessment({
      ...createBaseAssessment(),

      riskScore: 0,

      riskLevel:
        RISK_LEVELS.HIGH,

      recommendation:
        RISK_RECOMMENDATIONS
          .ESCALATE,

      reviewRequired: true
    });

  await assert.rejects(
    inconsistentLevel.validate(),
    /Risk level does not match/
  );

  console.log(
    "Risk score and level consistency verified"
  );

  const inconsistentRecommendation =
    new RiskAssessment({
      ...createBaseAssessment(),

      recommendation:
        RISK_RECOMMENDATIONS
          .MANUAL_REVIEW,

      reviewRequired: true
    });

  await assert.rejects(
    inconsistentRecommendation
      .validate(),
    /Recommendation does not match|Review requirement does not match/
  );

  console.log(
    "Risk outcome consistency verified"
  );

  const failedWithoutError =
    new RiskAssessment({
      applicationId:
        new mongoose.Types.ObjectId(),

      userId:
        new mongoose.Types.ObjectId(),

      documentId:
        new mongoose.Types.ObjectId(),

      assessmentStatus:
        ASSESSMENT_STATUSES.FAILED,

      assessedAt:
        new Date()
    });

  await assert.rejects(
    failedWithoutError.validate(),
    /failed assessment requires an error message/i
  );

  console.log(
    "Failed-assessment error requirement verified"
  );

  const validFailedAssessment =
    new RiskAssessment({
      applicationId:
        new mongoose.Types.ObjectId(),

      userId:
        new mongoose.Types.ObjectId(),

      documentId:
        new mongoose.Types.ObjectId(),

      assessmentStatus:
        ASSESSMENT_STATUSES.FAILED,

      assessmentError:
        "Risk assessment could not be completed",

      assessedAt:
        new Date()
    });

  await validFailedAssessment.validate();

  assert.equal(
    validFailedAssessment
      .riskScore,
    null
  );

  assert.equal(
    validFailedAssessment
      .riskLevel,
    null
  );

  console.log(
    "Valid failed-assessment state verified"
  );

  const invalidFactor =
    new RiskAssessment({
      ...createBaseAssessment(),

      riskFactors: [
        {
          code:
            "UNAPPROVED_FACTOR",

          category:
            RISK_FACTOR_CATEGORIES
              .SYSTEM,

          description:
            "Invalid test factor",

          scoreImpact:
            10,

          observedValue:
            "test",

          severity:
            RISK_FACTOR_SEVERITIES
              .MEDIUM
        }
      ]
    });

  await assert.rejects(
    invalidFactor.validate(),
    /UNAPPROVED_FACTOR|enum/i
  );

  console.log(
    "Unapproved risk-factor codes rejected"
  );

  console.log(
    "Sprint 4 RiskAssessment schema verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 4 RiskAssessment schema verification failed:",
    error
  );

  process.exitCode = 1;
}