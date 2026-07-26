import assert from "node:assert/strict";

import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_VALUES,
  ADMIN_REVIEW_ACTIONS,
  ADMIN_REVIEW_ACTION_VALUES,
  REVIEW_ACTION_TO_STATUS,
  FINAL_APPLICATION_STATUSES,
  REVIEWABLE_APPLICATION_STATUSES,
  REVIEW_ACTIONS_REQUIRING_COMMENTS,
  REVIEW_COMMENT_RULES,
  getStatusForReviewAction,
  isFinalApplicationStatus,
  isReviewableApplicationStatus,
  reviewActionRequiresComments
} from "../src/config/kycReviewConstants.js";

import KYCApplication from
  "../src/models/KYCApplication.js";

assert.deepEqual(
  APPLICATION_STATUS_VALUES,
  [
    "pending",
    "under_review",
    "approved",
    "rejected"
  ]
);

assert.deepEqual(
  ADMIN_REVIEW_ACTION_VALUES,
  [
    "approve",
    "reject",
    "retain_under_review"
  ]
);

console.log(
  "Application statuses and administrator review actions verified"
);

assert.equal(
  REVIEW_ACTION_TO_STATUS[
  ADMIN_REVIEW_ACTIONS.APPROVE
  ],
  APPLICATION_STATUSES.APPROVED
);

assert.equal(
  REVIEW_ACTION_TO_STATUS[
  ADMIN_REVIEW_ACTIONS.REJECT
  ],
  APPLICATION_STATUSES.REJECTED
);

assert.equal(
  REVIEW_ACTION_TO_STATUS[
  ADMIN_REVIEW_ACTIONS
    .RETAIN_UNDER_REVIEW
  ],
  APPLICATION_STATUSES
    .UNDER_REVIEW
);

assert.equal(
  getStatusForReviewAction(
    ADMIN_REVIEW_ACTIONS.APPROVE
  ),
  APPLICATION_STATUSES.APPROVED
);

assert.equal(
  getStatusForReviewAction(
    ADMIN_REVIEW_ACTIONS.REJECT
  ),
  APPLICATION_STATUSES.REJECTED
);

assert.equal(
  getStatusForReviewAction(
    ADMIN_REVIEW_ACTIONS
      .RETAIN_UNDER_REVIEW
  ),
  APPLICATION_STATUSES
    .UNDER_REVIEW
);

assert.throws(
  () =>
    getStatusForReviewAction(
      "unsupported_action"
    ),
  {
    message:
      "Unsupported administrator review action"
  }
);

console.log(
  "Administrator review action mappings verified"
);

assert.deepEqual(
  FINAL_APPLICATION_STATUSES,
  [
    APPLICATION_STATUSES.APPROVED,
    APPLICATION_STATUSES.REJECTED
  ]
);

assert.equal(
  isFinalApplicationStatus(
    APPLICATION_STATUSES.APPROVED
  ),
  true
);

assert.equal(
  isFinalApplicationStatus(
    APPLICATION_STATUSES.REJECTED
  ),
  true
);

assert.equal(
  isFinalApplicationStatus(
    APPLICATION_STATUSES
      .UNDER_REVIEW
  ),
  false
);

assert.deepEqual(
  REVIEWABLE_APPLICATION_STATUSES,
  [
    APPLICATION_STATUSES
      .UNDER_REVIEW
  ]
);

assert.equal(
  isReviewableApplicationStatus(
    APPLICATION_STATUSES
      .UNDER_REVIEW
  ),
  true
);

assert.equal(
  isReviewableApplicationStatus(
    APPLICATION_STATUSES.PENDING
  ),
  false
);

console.log(
  "Final and reviewable application status policies verified"
);

assert.deepEqual(
  REVIEW_ACTIONS_REQUIRING_COMMENTS,
  [
    ADMIN_REVIEW_ACTIONS.REJECT,
    ADMIN_REVIEW_ACTIONS
      .RETAIN_UNDER_REVIEW
  ]
);

assert.equal(
  reviewActionRequiresComments(
    ADMIN_REVIEW_ACTIONS.REJECT
  ),
  true
);

assert.equal(
  reviewActionRequiresComments(
    ADMIN_REVIEW_ACTIONS
      .RETAIN_UNDER_REVIEW
  ),
  true
);

assert.equal(
  reviewActionRequiresComments(
    ADMIN_REVIEW_ACTIONS.APPROVE
  ),
  false
);

assert.equal(
  REVIEW_COMMENT_RULES
    .MIN_REQUIRED_LENGTH,
  10
);

assert.equal(
  REVIEW_COMMENT_RULES.MAX_LENGTH,
  1000
);

console.log(
  "Administrator review-comment policies verified"
);

const applicationStatusPath =
  KYCApplication.schema.path(
    "applicationStatus"
  );

assert.deepEqual(
  applicationStatusPath.enumValues,
  APPLICATION_STATUS_VALUES
);

assert.equal(
  applicationStatusPath
    .defaultValue,
  APPLICATION_STATUSES.PENDING
);

const reviewCommentsPath =
  KYCApplication.schema.path(
    "reviewComments"
  );

assert.equal(
  reviewCommentsPath.options.maxlength,
  REVIEW_COMMENT_RULES.MAX_LENGTH
);

console.log(
  "KYCApplication schema alignment verified"
);

assert.equal(
  Object.isFrozen(
    APPLICATION_STATUSES
  ),
  true
);

assert.equal(
  Object.isFrozen(
    ADMIN_REVIEW_ACTIONS
  ),
  true
);

assert.equal(
  Object.isFrozen(
    REVIEW_ACTION_TO_STATUS
  ),
  true
);

console.log(
  "KYC review configuration immutability verified"
);

console.log(
  "Sprint 5 KYC review constants verification passed"
);