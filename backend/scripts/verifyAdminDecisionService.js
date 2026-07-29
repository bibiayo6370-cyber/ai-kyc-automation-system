import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import mongoose from "mongoose";

import connectDB from "../src/config/database.js";
import {
  ASSESSMENT_STATUSES, RISK_LEVELS, RISK_RECOMMENDATIONS,
  RISK_RULES_VERSION, WATCHLIST_STATUSES
} from "../src/config/riskConstants.js";
import {
  ADMIN_REVIEW_ACTIONS,
  APPLICATION_STATUSES
} from "../src/config/kycReviewConstants.js";
import { AUDIT_ACTIONS } from "../src/config/auditLogConstants.js";

import User from "../src/models/User.js";
import KYCApplication from "../src/models/KYCApplication.js";
import RiskAssessment from "../src/models/RiskAssessment.js";
import AuditLog from "../src/models/AuditLog.js";
import { reviewKycApplication } from "../src/services/adminKycDecisionService.js";

const createdUserIds = [];
const createdApplicationIds = [];

function uniquePhoneNumber() {
  return `+23480${randomInt(10000000, 99999999)}`;
}

async function createUser({
  label,
  role = "customer",
  status = "active"
}) {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);

  const user = await User.create({
    fullName: `${label} Decision User`,
    email: `${label}-${suffix}@example.com`,
    phoneNumber: uniquePhoneNumber(),
    passwordHash: "decision-verification-password-hash",
    role,
    status
  });

  createdUserIds.push(user._id);
  return user;
}

async function createApplication({
  customer,
  label,
  applicationStatus = APPLICATION_STATUSES.UNDER_REVIEW
}) {
  const application = await KYCApplication.create({
    userId: customer._id,
    fullName: `${label} Decision Customer`,
    dateOfBirth: new Date("1990-01-01"),
    gender: "male",
    nationality: "Nigerian",
    residentialAddress: `${label} Decision Test Street, Lagos`,
    phoneNumber: uniquePhoneNumber(),
    occupation: "Software Tester",
    applicationStatus
  });

  createdApplicationIds.push(application._id);
  return application;
}

async function createCompletedAssessment({
  application,
  customer
}) {
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

async function createReviewFixture(
  label,
  applicationStatus = APPLICATION_STATUSES.UNDER_REVIEW,
  withAssessment = true
) {
  const customer = await createUser({ label });
  const application = await createApplication({
    customer,
    label,
    applicationStatus
  });

  const assessment = withAssessment
    ? await createCompletedAssessment({ application, customer })
    : null;

  return { customer, application, assessment };
}

try {
  await connectDB();

  const administrator = await createUser({
    label: "Active Admin",
    role: "admin"
  });

  const inactiveAdministrator = await createUser({
    label: "Inactive Admin",
    role: "admin",
    status: "inactive"
  });

  const approvalFixture = await createReviewFixture("Approval");

  const approvalResult = await reviewKycApplication({
    applicationId: approvalFixture.application._id,
    administratorId: administrator._id,
    action: ADMIN_REVIEW_ACTIONS.APPROVE
  });

  assert.equal(
    approvalResult.application.applicationStatus,
    APPLICATION_STATUSES.APPROVED
  );

  assert.equal(
    String(approvalResult.application.reviewedBy),
    String(administrator._id)
  );

  assert.ok(approvalResult.application.reviewDate);
  assert.equal(approvalResult.application.reviewComments, null);

  assert.equal(
    String(approvalResult.assessment._id),
    String(approvalFixture.assessment._id)
  );

  assert.equal(
    approvalResult.auditLog.action,
    AUDIT_ACTIONS.APPLICATION_APPROVED
  );

  assert.equal(
    approvalResult.auditLog.newStatus,
    APPLICATION_STATUSES.APPROVED
  );

  console.log(
    "Administrator approval decision and audit verified"
  );

  await assert.rejects(
    reviewKycApplication({
      applicationId: approvalFixture.application._id,
      administratorId: administrator._id,
      action: ADMIN_REVIEW_ACTIONS.REJECT,
      reviewComments:
        "A second final decision must not be accepted."
    }),
    error =>
      error.statusCode === 409 &&
      error.message ===
      "Only applications under review can receive an administrator decision"
  );

  console.log(
    "Final administrator decision immutability verified"
  );

  const rejectionFixture = await createReviewFixture("Rejection");

  const rejectionResult = await reviewKycApplication({
    applicationId: rejectionFixture.application._id,
    administratorId: administrator._id,
    action: ADMIN_REVIEW_ACTIONS.REJECT,
    reviewComments:
      "  Identity information could not be verified.  "
  });

  assert.equal(
    rejectionResult.application.applicationStatus,
    APPLICATION_STATUSES.REJECTED
  );

  assert.equal(
    rejectionResult.application.reviewComments,
    "Identity information could not be verified."
  );

  assert.equal(
    rejectionResult.auditLog.action,
    AUDIT_ACTIONS.APPLICATION_REJECTED
  );

  assert.equal(
    rejectionResult.auditLog.reviewComments,
    "Identity information could not be verified."
  );

  console.log(
    "Administrator rejection decision and audit verified"
  );

  const retainedFixture = await createReviewFixture("Retained");

  const retainedResult = await reviewKycApplication({
    applicationId: retainedFixture.application._id,
    administratorId: administrator._id,
    action: ADMIN_REVIEW_ACTIONS.RETAIN_UNDER_REVIEW,
    reviewComments:
      "Additional customer verification is required."
  });

  assert.equal(
    retainedResult.application.applicationStatus,
    APPLICATION_STATUSES.UNDER_REVIEW
  );

  assert.equal(
    String(retainedResult.application.reviewedBy),
    String(administrator._id)
  );

  assert.ok(retainedResult.application.reviewDate);

  assert.equal(
    retainedResult.auditLog.action,
    AUDIT_ACTIONS.APPLICATION_RETAINED_UNDER_REVIEW
  );

  console.log(
    "Administrator retain-under-review decision and audit verified"
  );

  const validationFixture = await createReviewFixture("Validation");

  await assert.rejects(
    reviewKycApplication({
      applicationId: validationFixture.application._id,
      administratorId: administrator._id,
      action: "unsupported_action",
      reviewComments: "Unsupported action test."
    }),
    error =>
      error.statusCode === 400 &&
      error.message ===
      "Unsupported administrator review action"
  );

  await assert.rejects(
    reviewKycApplication({
      applicationId: validationFixture.application._id,
      administratorId: administrator._id,
      action: ADMIN_REVIEW_ACTIONS.REJECT
    }),
    error =>
      error.statusCode === 400 &&
      error.message ===
      "Review comments are required for this administrator action"
  );

  await assert.rejects(
    reviewKycApplication({
      applicationId: validationFixture.application._id,
      administratorId: administrator._id,
      action: ADMIN_REVIEW_ACTIONS.REJECT,
      reviewComments: "Too short"
    }),
    error =>
      error.statusCode === 400 &&
      error.message ===
      "Review comments must contain at least 10 characters"
  );

  assert.equal(
    await AuditLog.countDocuments({
      applicationId: validationFixture.application._id
    }),
    0
  );

  console.log(
    "Administrator decision input validation verified"
  );

  const pendingFixture = await createReviewFixture(
    "Pending",
    APPLICATION_STATUSES.PENDING
  );

  await assert.rejects(
    reviewKycApplication({
      applicationId: pendingFixture.application._id,
      administratorId: administrator._id,
      action: ADMIN_REVIEW_ACTIONS.APPROVE
    }),
    error => error.statusCode === 409
  );

  const noAssessmentFixture = await createReviewFixture(
    "No Assessment",
    APPLICATION_STATUSES.UNDER_REVIEW,
    false
  );

  await assert.rejects(
    reviewKycApplication({
      applicationId: noAssessmentFixture.application._id,
      administratorId: administrator._id,
      action: ADMIN_REVIEW_ACTIONS.APPROVE
    }),
    error =>
      error.statusCode === 409 &&
      error.message ===
      "A completed risk assessment is required before administrator review"
  );

  console.log(
    "Administrator decision readiness validation verified"
  );

  const authorizationFixture =
    await createReviewFixture("Authorization");

  await assert.rejects(
    reviewKycApplication({
      applicationId: authorizationFixture.application._id,
      administratorId: authorizationFixture.customer._id,
      action: ADMIN_REVIEW_ACTIONS.APPROVE
    }),
    error => error.statusCode === 403
  );

  await assert.rejects(
    reviewKycApplication({
      applicationId: authorizationFixture.application._id,
      administratorId: inactiveAdministrator._id,
      action: ADMIN_REVIEW_ACTIONS.APPROVE
    }),
    error => error.statusCode === 403
  );

  await assert.rejects(
    reviewKycApplication({
      applicationId: "invalid-application-id",
      administratorId: administrator._id,
      action: ADMIN_REVIEW_ACTIONS.APPROVE
    }),
    error => error.statusCode === 400
  );

  console.log(
    "Administrator decision authorization and identifier validation verified"
  );

  console.log(
    "Sprint 5 administrator decision service verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 5 administrator decision service verification failed:",
    error
  );

  process.exitCode = 1;
} finally {
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

  console.log(
    "Temporary administrator decision records removed"
  );

  await mongoose.disconnect();
}