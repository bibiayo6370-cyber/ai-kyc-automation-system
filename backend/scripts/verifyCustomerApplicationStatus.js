import assert from "node:assert/strict";
import { once } from "node:events";
import { randomInt, randomUUID } from "node:crypto";

import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDB from "../src/config/database.js";
import {
  ASSESSMENT_STATUSES,
  RISK_LEVELS,
  RISK_RECOMMENDATIONS,
  RISK_RULES_VERSION,
  WATCHLIST_STATUSES
} from "../src/config/riskConstants.js";
import { APPLICATION_STATUSES } from "../src/config/kycReviewConstants.js";

import kycRoutes from "../src/routes/kycRoutes.js";
import User from "../src/models/User.js";
import KYCApplication from "../src/models/KYCApplication.js";
import RiskAssessment from "../src/models/RiskAssessment.js";

const createdUserIds = [];
const createdApplicationIds = [];
let server;

function uniquePhoneNumber() {
  return `+23480${randomInt(10000000, 99999999)}`;
}

async function createUser(label, role = "customer") {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const user = await User.create({
    fullName: `${label} Status User`,
    email: `${label}-${suffix}@example.com`,
    phoneNumber: uniquePhoneNumber(),
    passwordHash: "status-verification-password-hash",
    role,
    status: "active"
  });

  createdUserIds.push(user._id);
  return user;
}

async function createApplication({
  customer,
  label,
  applicationStatus,
  reviewer = null,
  reviewComments = null
}) {
  const isFinal =
    applicationStatus === APPLICATION_STATUSES.APPROVED ||
    applicationStatus === APPLICATION_STATUSES.REJECTED;

  const application = await KYCApplication.create({
    userId: customer._id,
    fullName: `${label} Status Customer`,
    dateOfBirth: new Date("1990-01-01"),
    gender: "male",
    nationality: "Nigerian",
    residentialAddress: `${label} Status Test Street, Lagos`,
    phoneNumber: uniquePhoneNumber(),
    occupation: "Software Tester",
    applicationStatus,
    reviewedBy: isFinal ? reviewer?._id : null,
    reviewDate: isFinal ? new Date() : null,
    reviewComments
  });

  createdApplicationIds.push(application._id);
  return application;
}

async function createAssessment({ application, customer }) {
  return RiskAssessment.create({
    applicationId: application._id,
    userId: customer._id,
    documentId: new mongoose.Types.ObjectId(),
    assessmentStatus: ASSESSMENT_STATUSES.COMPLETED,
    riskScore: 0,
    riskLevel: RISK_LEVELS.LOW,
    recommendation: RISK_RECOMMENDATIONS.PROCEED,
    reviewRequired: false,
    riskFactors: [],
    assessmentReasons: ["No material KYC risk factors were detected"],
    watchlistScreening: {
      status: WATCHLIST_STATUSES.CLEAR,
      referenceId: null,
      matchedName: null,
      simulated: true,
      screenedAt: new Date()
    },
    inputSnapshot: {
      documentType: "national_id",
      ocrStatus: "processed",
      extractedTextPresent: true,
      ocrConfidence: 95,
      verificationStatus: "matched",
      nameMatchScore: 100,
      duplicateDocumentDetected: false
    },
    rulesVersion: RISK_RULES_VERSION,
    assessmentError: null,
    assessedAt: new Date()
  });
}

async function createFixture({
  label,
  applicationStatus,
  reviewer = null,
  reviewComments = null,
  withAssessment = true
}) {
  const customer = await createUser(label);
  const application = await createApplication({
    customer,
    label,
    applicationStatus,
    reviewer,
    reviewComments
  });
  const assessment = withAssessment
    ? await createAssessment({ application, customer })
    : null;

  return { customer, application, assessment };
}

function createToken(user) {
  return jwt.sign(
    { userId: String(user._id) },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );
}

async function requestJson({ baseUrl, path, token }) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${baseUrl}${path}`, { headers });

  return {
    status: response.status,
    body: await response.json()
  };
}

try {
  await connectDB();

  const administrator = await createUser("Administrator", "admin");
  const pendingFixture = await createFixture({
    label: "Pending",
    applicationStatus: APPLICATION_STATUSES.PENDING,
    withAssessment: false
  });
  const reviewFixture = await createFixture({
    label: "Review",
    applicationStatus: APPLICATION_STATUSES.UNDER_REVIEW
  });
  const approvalFixture = await createFixture({
    label: "Approval",
    applicationStatus: APPLICATION_STATUSES.APPROVED,
    reviewer: administrator
  });
  const rejectionFixture = await createFixture({
    label: "Rejection",
    applicationStatus: APPLICATION_STATUSES.REJECTED,
    reviewer: administrator,
    reviewComments: "Identity information could not be verified."
  });

  const app = express();
  app.use(express.json());
  app.use("/api/v1/applications", kycRoutes);

  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  assert.equal(typeof address, "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const approvalResult = await requestJson({
    baseUrl,
    path: `/api/v1/applications/${approvalFixture.application._id}/status`,
    token: createToken(approvalFixture.customer)
  });

  assert.equal(approvalResult.status, 200);
  assert.equal(
    approvalResult.body.status.applicationStatus,
    APPLICATION_STATUSES.APPROVED
  );
  assert.equal(approvalResult.body.status.decision.isFinal, true);
  assert.ok(approvalResult.body.status.decision.reviewDate);
  assert.equal(approvalResult.body.status.decision.reviewComments, null);
  assert.equal("reviewedBy" in approvalResult.body.status.decision, false);
  assert.equal("userId" in approvalResult.body.status, false);
  assert.equal(
    approvalResult.body.status.riskAssessment.riskLevel,
    RISK_LEVELS.LOW
  );
  assert.equal(
    "riskFactors" in approvalResult.body.status.riskAssessment,
    false
  );
  assert.equal(
    "watchlistScreening" in approvalResult.body.status.riskAssessment,
    false
  );
  assert.equal(
    "inputSnapshot" in approvalResult.body.status.riskAssessment,
    false
  );

  console.log("Customer approved status and safe risk summary verified");

  const rejectionResult = await requestJson({
    baseUrl,
    path: `/api/v1/applications/${rejectionFixture.application._id}/status`,
    token: createToken(rejectionFixture.customer)
  });

  assert.equal(rejectionResult.status, 200);
  assert.equal(
    rejectionResult.body.status.applicationStatus,
    APPLICATION_STATUSES.REJECTED
  );
  assert.equal(rejectionResult.body.status.decision.isFinal, true);
  assert.equal(
    rejectionResult.body.status.decision.reviewComments,
    "Identity information could not be verified."
  );

  console.log("Customer rejection status and decision comments verified");

  const pendingResult = await requestJson({
    baseUrl,
    path: `/api/v1/applications/${pendingFixture.application._id}/status`,
    token: createToken(pendingFixture.customer)
  });

  assert.equal(pendingResult.status, 200);
  assert.equal(
    pendingResult.body.status.applicationStatus,
    APPLICATION_STATUSES.PENDING
  );
  assert.equal(pendingResult.body.status.decision.isFinal, false);
  assert.equal(pendingResult.body.status.riskAssessment, null);

  const reviewResult = await requestJson({
    baseUrl,
    path: `/api/v1/applications/${reviewFixture.application._id}/status`,
    token: createToken(reviewFixture.customer)
  });

  assert.equal(reviewResult.status, 200);
  assert.equal(
    reviewResult.body.status.applicationStatus,
    APPLICATION_STATUSES.UNDER_REVIEW
  );
  assert.equal(reviewResult.body.status.decision.isFinal, false);
  assert.equal(
    reviewResult.body.status.statusMessage,
    "Your KYC application is under administrator review."
  );

  console.log("Customer pending and under-review status responses verified");

  const crossCustomerResult = await requestJson({
    baseUrl,
    path: `/api/v1/applications/${approvalFixture.application._id}/status`,
    token: createToken(rejectionFixture.customer)
  });

  assert.equal(crossCustomerResult.status, 404);

  const malformedResult = await requestJson({
    baseUrl,
    path: "/api/v1/applications/not-a-valid-id/status",
    token: createToken(approvalFixture.customer)
  });

  assert.equal(malformedResult.status, 400);

  const noTokenResult = await requestJson({
    baseUrl,
    path: `/api/v1/applications/${approvalFixture.application._id}/status`
  });

  assert.equal(noTokenResult.status, 401);

  console.log("Customer application-status ownership and access control verified");
  console.log("Sprint 5 customer application-status endpoint verification passed");
} catch (error) {
  console.error(
    "Sprint 5 customer application-status endpoint verification failed:",
    error
  );
  process.exitCode = 1;
} finally {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }

  if (createdApplicationIds.length > 0) {
    await RiskAssessment.deleteMany({
      applicationId: { $in: createdApplicationIds }
    }).catch(() => undefined);

    await KYCApplication.deleteMany({
      _id: { $in: createdApplicationIds }
    }).catch(() => undefined);
  }

  if (createdUserIds.length > 0) {
    await User.deleteMany({
      _id: { $in: createdUserIds }
    }).catch(() => undefined);
  }

  console.log("Temporary customer status verification records removed");
  await mongoose.disconnect();
}