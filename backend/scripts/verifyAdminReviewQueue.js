import assert from "node:assert/strict";
import {
  once
} from "node:events";
import {
  randomInt,
  randomUUID
} from "node:crypto";

import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDB from
  "../src/config/database.js";

import {
  ASSESSMENT_STATUSES,
  RISK_LEVELS,
  RISK_RECOMMENDATIONS,
  RISK_RULES_VERSION,
  WATCHLIST_STATUSES
} from "../src/config/riskConstants.js";

import {
  APPLICATION_STATUSES
} from "../src/config/kycReviewConstants.js";

import {
  AUDIT_ACTIONS
} from "../src/config/auditLogConstants.js";

import adminKycRoutes from
  "../src/routes/adminKycRoutes.js";

import User from
  "../src/models/User.js";

import KYCApplication from
  "../src/models/KYCApplication.js";

import RiskAssessment from
  "../src/models/RiskAssessment.js";

import AuditLog from
  "../src/models/AuditLog.js";

import {
  moveApplicationToReviewAfterAssessment
} from
  "../src/services/applicationReviewTransitionService.js";

const createdUserIds = [];
const createdApplicationIds = [];

let server;

function uniquePhoneNumber() {
  return `+23480${randomInt(
    10000000,
    99999999
  )}`;
}

async function createUser(
  label,
  role = "customer"
) {
  const suffix =
    randomUUID()
      .replaceAll("-", "")
      .slice(0, 12);

  const user =
    await User.create({
      fullName:
        `${label} Queue User`,

      email:
        `${label}-${suffix}@example.com`,

      phoneNumber:
        uniquePhoneNumber(),

      passwordHash:
        "queue-verification-password-hash",

      role,

      status:
        "active"
    });

  createdUserIds.push(
    user._id
  );

  return user;
}

async function createApplication(
  user,
  label,
  applicationStatus
) {
  const application =
    await KYCApplication.create({
      userId:
        user._id,

      fullName:
        `${label} Evaluation Customer`,

      dateOfBirth:
        new Date(
          "1990-01-01"
        ),

      gender:
        "male",

      nationality:
        "Nigerian",

      residentialAddress:
        `${label} Queue Test Street, Lagos`,

      phoneNumber:
        uniquePhoneNumber(),

      occupation:
        "Software Tester",

      applicationStatus
    });

  createdApplicationIds.push(
    application._id
  );

  return application;
}

async function createAssessment({
  application,
  user,
  riskScore,
  riskLevel,
  recommendation,
  reviewRequired
}) {
  return RiskAssessment.create({
    applicationId:
      application._id,

    userId:
      user._id,

    documentId:
      new mongoose.Types.ObjectId(),

    assessmentStatus:
      ASSESSMENT_STATUSES.COMPLETED,

    riskScore,
    riskLevel,
    recommendation,
    reviewRequired,

    riskFactors: [],

    assessmentReasons: [
      "Controlled administrator queue fixture"
    ],

    watchlistScreening: {
      status:
        WATCHLIST_STATUSES.CLEAR,

      referenceId:
        null,

      matchedName:
        null,

      simulated:
        true,

      screenedAt:
        new Date()
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
  });
}

async function createQueueFixture({
  label,
  applicationStatus,
  riskScore,
  riskLevel,
  recommendation,
  reviewRequired
}) {
  const user =
    await createUser(
      label
    );

  const application =
    await createApplication(
      user,
      label,
      applicationStatus
    );

  const assessment =
    await createAssessment({
      application,
      user,
      riskScore,
      riskLevel,
      recommendation,
      reviewRequired
    });

  return {
    user,
    application,
    assessment
  };
}

function createToken(
  user
) {
  return jwt.sign(
    {
      userId:
        String(user._id)
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        "5m"
    }
  );
}

async function requestJson({
  baseUrl,
  path,
  token
}) {
  const headers =
    token
      ? {
        Authorization:
          `Bearer ${token}`
      }
      : {};

  const response =
    await fetch(
      `${baseUrl}${path}`,
      {
        headers
      }
    );

  return {
    status:
      response.status,

    body:
      await response.json()
  };
}

try {
  await connectDB();

  const administrator =
    await createUser(
      "Administrator",
      "admin"
    );

  const highScenario =
    await createQueueFixture({
      label:
        "High Risk",

      applicationStatus:
        APPLICATION_STATUSES.PENDING,

      riskScore:
        100,

      riskLevel:
        RISK_LEVELS.HIGH,

      recommendation:
        RISK_RECOMMENDATIONS.ESCALATE,

      reviewRequired:
        true
    });

  const movedToReview =
    await moveApplicationToReviewAfterAssessment({
      applicationId:
        highScenario.application._id,

      customerId:
        highScenario.user._id,

      riskAssessmentId:
        highScenario.assessment._id
    });

  assert.equal(
    movedToReview,
    true
  );

  const refreshedHighApplication =
    await KYCApplication.findById(
      highScenario.application._id
    );

  assert.equal(
    refreshedHighApplication
      .applicationStatus,
    APPLICATION_STATUSES
      .UNDER_REVIEW
  );

  const transitionAudit =
    await AuditLog.findOne({
      applicationId:
        highScenario.application._id,

      action:
        AUDIT_ACTIONS
          .APPLICATION_MOVED_TO_REVIEW
    });

  assert.ok(
    transitionAudit
  );

  assert.equal(
    String(
      transitionAudit
        .riskAssessmentId
    ),
    String(
      highScenario
        .assessment
        ._id
    )
  );

  const repeatedTransition =
    await moveApplicationToReviewAfterAssessment({
      applicationId:
        highScenario.application._id,

      customerId:
        highScenario.user._id,

      riskAssessmentId:
        highScenario.assessment._id
    });

  assert.equal(
    repeatedTransition,
    false
  );

  assert.equal(
    await AuditLog.countDocuments({
      applicationId:
        highScenario.application._id,

      action:
        AUDIT_ACTIONS
          .APPLICATION_MOVED_TO_REVIEW
    }),
    1
  );

  console.log(
    "Automatic review transition and idempotent audit verified"
  );

  await createQueueFixture({
    label:
      "Medium Risk",

    applicationStatus:
      APPLICATION_STATUSES
        .UNDER_REVIEW,

    riskScore:
      35,

    riskLevel:
      RISK_LEVELS.MEDIUM,

    recommendation:
      RISK_RECOMMENDATIONS
        .MANUAL_REVIEW,

    reviewRequired:
      true
  });

  await createQueueFixture({
    label:
      "Low Risk",

    applicationStatus:
      APPLICATION_STATUSES
        .UNDER_REVIEW,

    riskScore:
      0,

    riskLevel:
      RISK_LEVELS.LOW,

    recommendation:
      RISK_RECOMMENDATIONS.PROCEED,

    reviewRequired:
      false
  });

  const pendingUser =
    await createUser(
      "Pending"
    );

  await createApplication(
    pendingUser,
    "Pending",
    APPLICATION_STATUSES.PENDING
  );

  const app =
    express();

  app.use(
    "/api/v1/admin/kyc",
    adminKycRoutes
  );

  server =
    app.listen(
      0,
      "127.0.0.1"
    );

  await once(
    server,
    "listening"
  );

  const address =
    server.address();

  assert.equal(
    typeof address,
    "object"
  );

  const baseUrl =
    `http://127.0.0.1:${address.port}`;

  const adminToken =
    createToken(
      administrator
    );

  const queueResult =
    await requestJson({
      baseUrl,

      path:
        "/api/v1/admin/kyc/review-queue",

      token:
        adminToken
    });

  assert.equal(
    queueResult.status,
    200
  );

  assert.equal(
    queueResult.body.queue.length,
    3
  );

  assert.deepEqual(
    queueResult.body.queue.map(
      item =>
        item
          .riskAssessment
          .riskLevel
    ),
    [
      RISK_LEVELS.HIGH,
      RISK_LEVELS.MEDIUM,
      RISK_LEVELS.LOW
    ]
  );

  assert.equal(
    queueResult
      .body
      .pagination
      .totalItems,
    3
  );

  assert.equal(
    "passwordHash" in
    queueResult
      .body
      .queue[0]
      .customer,
    false
  );

  assert.equal(
    "riskFactors" in
    queueResult
      .body
      .queue[0]
      .riskAssessment,
    false
  );

  assert.equal(
    "watchlistScreening" in
    queueResult
      .body
      .queue[0]
      .riskAssessment,
    false
  );

  console.log(
    "Administrator review queue ordering and safe summary verified"
  );

  const highRiskResult =
    await requestJson({
      baseUrl,

      path:
        "/api/v1/admin/kyc/review-queue?riskLevel=high",

      token:
        adminToken
    });

  assert.equal(
    highRiskResult.status,
    200
  );

  assert.equal(
    highRiskResult.body.queue.length,
    1
  );

  assert.equal(
    highRiskResult
      .body
      .queue[0]
      .riskAssessment
      .riskLevel,
    RISK_LEVELS.HIGH
  );

  const paginationResult =
    await requestJson({
      baseUrl,

      path:
        "/api/v1/admin/kyc/review-queue?page=1&limit=2",

      token:
        adminToken
    });

  assert.equal(
    paginationResult.status,
    200
  );

  assert.equal(
    paginationResult.body.queue.length,
    2
  );

  assert.equal(
    paginationResult
      .body
      .pagination
      .totalPages,
    2
  );

  console.log(
    "Administrator review queue filtering and pagination verified"
  );

  const invalidRiskResult =
    await requestJson({
      baseUrl,

      path:
        "/api/v1/admin/kyc/review-queue?riskLevel=critical",

      token:
        adminToken
    });

  assert.equal(
    invalidRiskResult.status,
    400
  );

  assert.equal(
    invalidRiskResult.body.message,
    "Risk level must be low, medium or high"
  );

  const invalidPageResult =
    await requestJson({
      baseUrl,

      path:
        "/api/v1/admin/kyc/review-queue?page=0",

      token:
        adminToken
    });

  assert.equal(
    invalidPageResult.status,
    400
  );

  assert.equal(
    invalidPageResult.body.message,
    "Page must be a positive integer"
  );

  console.log(
    "Administrator review queue query validation verified"
  );

  const customerResult =
    await requestJson({
      baseUrl,

      path:
        "/api/v1/admin/kyc/review-queue",

      token:
        createToken(
          highScenario.user
        )
    });

  assert.equal(
    customerResult.status,
    403
  );

  const noTokenResult =
    await requestJson({
      baseUrl,

      path:
        "/api/v1/admin/kyc/review-queue"
    });

  assert.equal(
    noTokenResult.status,
    401
  );

  console.log(
    "Administrator review queue access control verified"
  );

  console.log(
    "Sprint 5 administrator review queue verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 5 administrator review queue verification failed:",
    error
  );

  process.exitCode =
    1;
} finally {
  if (server) {
    await new Promise(
      resolve =>
        server.close(
          resolve
        )
    );
  }

  if (
    createdApplicationIds.length > 0
  ) {
    await AuditLog.collection.deleteMany({
      applicationId: {
        $in:
          createdApplicationIds
      }
    }).catch(
      () => undefined
    );

    await RiskAssessment.deleteMany({
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

  if (
    createdUserIds.length > 0
  ) {
    await User.deleteMany({
      _id: {
        $in:
          createdUserIds
      }
    }).catch(
      () => undefined
    );
  }

  console.log(
    "Temporary administrator review queue records removed"
  );

  await mongoose.disconnect();
}