import assert from "node:assert/strict";
import mongoose from "mongoose";

import connectDB from
  "../src/config/database.js";

import {
  APPLICATION_STATUSES,
  ADMIN_REVIEW_ACTIONS
} from "../src/config/kycReviewConstants.js";

import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ACTIONS
} from "../src/config/auditLogConstants.js";

import AuditLog, {
  APPEND_ONLY_ERROR
} from "../src/models/AuditLog.js";

import {
  getApplicationAuditLogs,
  recordAdministratorReviewAction,
  recordApplicationMovedToReview
} from "../src/services/auditLogService.js";

const createdAuditLogIds = [];

function rememberAuditLog(
  auditLog
) {
  createdAuditLogIds.push(
    auditLog._id
  );

  return auditLog;
}

try {
  await connectDB();

  const customerId =
    new mongoose.Types.ObjectId();

  const administratorId =
    new mongoose.Types.ObjectId();

  const applicationId =
    new mongoose.Types.ObjectId();

  const riskAssessmentId =
    new mongoose.Types.ObjectId();

  const systemAuditLog =
    rememberAuditLog(
      await recordApplicationMovedToReview({
        applicationId,
        customerId,
        riskAssessmentId
      })
    );

  assert.equal(
    systemAuditLog.actorRole,
    AUDIT_ACTOR_ROLES.SYSTEM
  );

  assert.equal(
    systemAuditLog.actorId,
    null
  );

  assert.equal(
    systemAuditLog.action,
    AUDIT_ACTIONS
      .APPLICATION_MOVED_TO_REVIEW
  );

  assert.equal(
    systemAuditLog.previousStatus,
    APPLICATION_STATUSES.PENDING
  );

  assert.equal(
    systemAuditLog.newStatus,
    APPLICATION_STATUSES
      .UNDER_REVIEW
  );

  assert.equal(
    String(
      systemAuditLog.riskAssessmentId
    ),
    String(
      riskAssessmentId
    )
  );

  console.log(
    "Automated under-review audit event verified"
  );

  const retainedAuditLog =
    rememberAuditLog(
      await recordAdministratorReviewAction({
        applicationId,
        customerId,
        administratorId,
        action:
          ADMIN_REVIEW_ACTIONS
            .RETAIN_UNDER_REVIEW,
        reviewComments:
          "  Additional customer verification is required.  "
      })
    );

  assert.equal(
    retainedAuditLog.actorRole,
    AUDIT_ACTOR_ROLES.ADMIN
  );

  assert.equal(
    String(
      retainedAuditLog.actorId
    ),
    String(
      administratorId
    )
  );

  assert.equal(
    retainedAuditLog.action,
    AUDIT_ACTIONS
      .APPLICATION_RETAINED_UNDER_REVIEW
  );

  assert.equal(
    retainedAuditLog.previousStatus,
    APPLICATION_STATUSES
      .UNDER_REVIEW
  );

  assert.equal(
    retainedAuditLog.newStatus,
    APPLICATION_STATUSES
      .UNDER_REVIEW
  );

  assert.equal(
    retainedAuditLog.reviewComments,
    "Additional customer verification is required."
  );

  console.log(
    "Administrator retained-under-review audit event verified"
  );

  const approvedAuditLog =
    rememberAuditLog(
      await recordAdministratorReviewAction({
        applicationId:
          new mongoose.Types.ObjectId(),
        customerId,
        administratorId,
        action:
          ADMIN_REVIEW_ACTIONS.APPROVE
      })
    );

  assert.equal(
    approvedAuditLog.action,
    AUDIT_ACTIONS
      .APPLICATION_APPROVED
  );

  assert.equal(
    approvedAuditLog.newStatus,
    APPLICATION_STATUSES.APPROVED
  );

  assert.equal(
    approvedAuditLog.reviewComments,
    null
  );

  console.log(
    "Administrator approval audit event verified"
  );

  const rejectedAuditLog =
    rememberAuditLog(
      await recordAdministratorReviewAction({
        applicationId:
          new mongoose.Types.ObjectId(),
        customerId,
        administratorId,
        action:
          ADMIN_REVIEW_ACTIONS.REJECT,
        reviewComments:
          "Identity information could not be verified."
      })
    );

  assert.equal(
    rejectedAuditLog.action,
    AUDIT_ACTIONS
      .APPLICATION_REJECTED
  );

  assert.equal(
    rejectedAuditLog.newStatus,
    APPLICATION_STATUSES.REJECTED
  );

  console.log(
    "Administrator rejection audit event verified"
  );

  const applicationAuditLogs =
    await getApplicationAuditLogs({
      applicationId
    });

  assert.equal(
    applicationAuditLogs.length,
    2
  );

  assert.equal(
    applicationAuditLogs[0].action,
    AUDIT_ACTIONS
      .APPLICATION_MOVED_TO_REVIEW
  );

  assert.equal(
    applicationAuditLogs[1].action,
    AUDIT_ACTIONS
      .APPLICATION_RETAINED_UNDER_REVIEW
  );

  console.log(
    "Chronological application audit history verified"
  );

  await assert.rejects(
    recordAdministratorReviewAction({
      applicationId:
        new mongoose.Types.ObjectId(),
      customerId,
      administratorId,
      action:
        "unsupported_action",
      reviewComments:
        "Unsupported test action."
    }),
    error =>
      error.statusCode === 400 &&
      error.message ===
      "Unsupported administrator review action"
  );

  await assert.rejects(
    recordAdministratorReviewAction({
      applicationId:
        new mongoose.Types.ObjectId(),
      customerId,
      administratorId,
      action:
        ADMIN_REVIEW_ACTIONS.REJECT
    }),
    error =>
      error.statusCode === 400 &&
      error.message ===
      "Review comments are required for this administrator action"
  );

  await assert.rejects(
    recordAdministratorReviewAction({
      applicationId:
        new mongoose.Types.ObjectId(),
      customerId,
      administratorId,
      action:
        ADMIN_REVIEW_ACTIONS.REJECT,
      reviewComments:
        "Too short"
    }),
    error =>
      error.statusCode === 400 &&
      error.message ===
      "Review comments must contain at least 10 characters"
  );

  await assert.rejects(
    recordApplicationMovedToReview({
      applicationId:
        "invalid-application-id",
      customerId,
      riskAssessmentId
    }),
    error =>
      error.statusCode === 400
  );

  console.log(
    "Audit input validation verified"
  );

  const persistedAuditLog =
    await AuditLog.findById(
      systemAuditLog._id
    );

  await assert.rejects(
    persistedAuditLog.save(),
    error =>
      error.message ===
      APPEND_ONLY_ERROR
  );

  await assert.rejects(
    AuditLog.updateOne(
      {
        _id:
          systemAuditLog._id
      },
      {
        $set: {
          newStatus:
            APPLICATION_STATUSES.APPROVED
        }
      }
    ),
    error =>
      error.message ===
      APPEND_ONLY_ERROR
  );

  await assert.rejects(
    AuditLog.deleteOne({
      _id:
        systemAuditLog._id
    }),
    error =>
      error.message ===
      APPEND_ONLY_ERROR
  );

  console.log(
    "Append-only audit protection verified"
  );

  console.log(
    "Sprint 5 audit log model and service verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 5 audit log verification failed:",
    error
  );

  process.exitCode = 1;
} finally {
  if (
    createdAuditLogIds.length > 0
  ) {
    await AuditLog.collection.deleteMany({
      _id: {
        $in:
          createdAuditLogIds
      }
    }).catch(
      () => undefined
    );
  }

  console.log(
    "Temporary audit verification records removed"
  );

  await mongoose.disconnect();
}