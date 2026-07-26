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
import {
  ADMIN_REVIEW_ACTIONS,
  APPLICATION_STATUSES
} from "../src/config/kycReviewConstants.js";
import { AUDIT_ACTIONS } from "../src/config/auditLogConstants.js";

import adminKycRoutes from "../src/routes/adminKycRoutes.js";
import User from "../src/models/User.js";
import KYCApplication from "../src/models/KYCApplication.js";
import RiskAssessment from "../src/models/RiskAssessment.js";
import AuditLog from "../src/models/AuditLog.js";

const createdUserIds = [];
const createdApplicationIds = [];
let server;

function uniquePhoneNumber() {
  return `+23480${randomInt(10000000, 99999999)}`;
}

async function createUser({ label, role = "customer" }) {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);

  const user = await User.create({
    fullName: `${label} Endpoint User`,
    email: `${label}-${suffix}@example.com`,
    phoneNumber: uniquePhoneNumber(),
    passwordHash: "endpoint-verification-password-hash",
    role,
    status: "active"
  });

  createdUserIds.push(user._id);
  return user;
}

async function createFixture(label) {
  const customer = await createUser({ label });

  const application = await KYCApplication.create({
    userId: customer._id,
    fullName: `${label} Endpoint Customer`,
    dateOfBirth: new Date("1990-01-01"),
    gender: "male",
    nationality: "Nigerian",
    residentialAddress: `${label} Endpoint Test Street, Lagos`,
    phoneNumber: uniquePhoneNumber(),
    occupation: "Software Tester",
    applicationStatus: APPLICATION_STATUSES.UNDER_REVIEW
  });

  createdApplicationIds.push(application._id);

  const assessment = await RiskAssessment.create({
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

  return { customer, application, assessment };
}

function createToken(user) {
  return jwt.sign(
    { userId: String(user._id) },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );
}

async function requestJson({ baseUrl, path, token, method = "GET", body }) {
  const headers = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  return {
    status: response.status,
    body: await response.json()
  };
}

try {
  await connectDB();

  const administrator = await createUser({
    label: "Administrator",
    role: "admin"
  });

  const approvalFixture = await createFixture("Approval");

  const app = express();
  app.use(express.json());
  app.use("/api/v1/admin/kyc", adminKycRoutes);

  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  assert.equal(typeof address, "object");

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const adminToken = createToken(administrator);

  const approvalResult = await requestJson({
    baseUrl,
    path: `/api/v1/admin/kyc/applications/${approvalFixture.application._id}/decision`,
    token: adminToken,
    method: "PATCH",
    body: { action: ADMIN_REVIEW_ACTIONS.APPROVE }
  });

  assert.equal(approvalResult.status, 200);
  assert.equal(
    approvalResult.body.message,
    "Administrator KYC decision recorded successfully"
  );
  assert.equal(
    approvalResult.body.decision.applicationStatus,
    APPLICATION_STATUSES.APPROVED
  );
  assert.equal(
    String(approvalResult.body.decision.reviewedBy),
    String(administrator._id)
  );
  assert.equal(
    approvalResult.body.decision.auditLog.action,
    AUDIT_ACTIONS.APPLICATION_APPROVED
  );
  assert.equal(
    approvalResult.body.decision.riskAssessment.riskLevel,
    RISK_LEVELS.LOW
  );

  console.log("Administrator approval endpoint verified");

  const repeatedDecisionResult = await requestJson({
    baseUrl,
    path: `/api/v1/admin/kyc/applications/${approvalFixture.application._id}/decision`,
    token: adminToken,
    method: "PATCH",
    body: {
      action: ADMIN_REVIEW_ACTIONS.REJECT,
      reviewComments: "A second final decision must not be accepted."
    }
  });

  assert.equal(repeatedDecisionResult.status, 409);

  console.log("Administrator endpoint final-decision immutability verified");

  const rejectionFixture = await createFixture("Rejection");

  const rejectionResult = await requestJson({
    baseUrl,
    path: `/api/v1/admin/kyc/applications/${rejectionFixture.application._id}/decision`,
    token: adminToken,
    method: "PATCH",
    body: {
      action: ADMIN_REVIEW_ACTIONS.REJECT,
      reviewComments: "Identity information could not be verified."
    }
  });

  assert.equal(rejectionResult.status, 200);
  assert.equal(
    rejectionResult.body.decision.applicationStatus,
    APPLICATION_STATUSES.REJECTED
  );
  assert.equal(
    rejectionResult.body.decision.reviewComments,
    "Identity information could not be verified."
  );
  assert.equal(
    rejectionResult.body.decision.auditLog.action,
    AUDIT_ACTIONS.APPLICATION_REJECTED
  );

  console.log("Administrator rejection endpoint verified");

  const retainedFixture = await createFixture("Retained");

  const retainedResult = await requestJson({
    baseUrl,
    path: `/api/v1/admin/kyc/applications/${retainedFixture.application._id}/decision`,
    token: adminToken,
    method: "PATCH",
    body: {
      action: ADMIN_REVIEW_ACTIONS.RETAIN_UNDER_REVIEW,
      reviewComments: "Additional customer verification is required."
    }
  });

  assert.equal(retainedResult.status, 200);
  assert.equal(
    retainedResult.body.decision.applicationStatus,
    APPLICATION_STATUSES.UNDER_REVIEW
  );
  assert.equal(
    retainedResult.body.decision.auditLog.action,
    AUDIT_ACTIONS.APPLICATION_RETAINED_UNDER_REVIEW
  );

  console.log("Administrator retain-under-review endpoint verified");

  const validationFixture = await createFixture("Validation");

  const unsupportedResult = await requestJson({
    baseUrl,
    path: `/api/v1/admin/kyc/applications/${validationFixture.application._id}/decision`,
    token: adminToken,
    method: "PATCH",
    body: { action: "unsupported_action" }
  });

  assert.equal(unsupportedResult.status, 400);

  const missingCommentsResult = await requestJson({
    baseUrl,
    path: `/api/v1/admin/kyc/applications/${validationFixture.application._id}/decision`,
    token: adminToken,
    method: "PATCH",
    body: { action: ADMIN_REVIEW_ACTIONS.REJECT }
  });

  assert.equal(missingCommentsResult.status, 400);

  const malformedResult = await requestJson({
    baseUrl,
    path: "/api/v1/admin/kyc/applications/not-a-valid-id/decision",
    token: adminToken,
    method: "PATCH",
    body: { action: ADMIN_REVIEW_ACTIONS.APPROVE }
  });

  assert.equal(malformedResult.status, 400);

  console.log("Administrator decision endpoint input validation verified");

  const customerResult = await requestJson({
    baseUrl,
    path: `/api/v1/admin/kyc/applications/${validationFixture.application._id}/decision`,
    token: createToken(validationFixture.customer),
    method: "PATCH",
    body: { action: ADMIN_REVIEW_ACTIONS.APPROVE }
  });

  assert.equal(customerResult.status, 403);

  const noTokenResult = await requestJson({
    baseUrl,
    path: `/api/v1/admin/kyc/applications/${validationFixture.application._id}/decision`,
    method: "PATCH",
    body: { action: ADMIN_REVIEW_ACTIONS.APPROVE }
  });

  assert.equal(noTokenResult.status, 401);

  console.log("Administrator decision endpoint access control verified");

  console.log("Sprint 5 administrator decision endpoint verification passed");
} catch (error) {
  console.error(
    "Sprint 5 administrator decision endpoint verification failed:",
    error
  );

  process.exitCode = 1;
} finally {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }

  if (createdApplicationIds.length > 0) {
    await AuditLog.collection.deleteMany({
      applicationId: { $in: createdApplicationIds }
    }).catch(() => undefined);

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

  console.log("Temporary administrator decision endpoint records removed");
  await mongoose.disconnect();
}