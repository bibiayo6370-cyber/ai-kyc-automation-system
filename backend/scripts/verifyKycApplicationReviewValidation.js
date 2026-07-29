import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
  APPLICATION_STATUSES,
  REVIEW_COMMENT_RULES
} from "../src/config/kycReviewConstants.js";

import KYCApplication from
  "../src/models/KYCApplication.js";

function createApplicationData(
  overrides = {}
) {
  return {
    userId:
      new mongoose.Types.ObjectId(),

    fullName:
      "Administrator Review Test Customer",

    dateOfBirth:
      new Date("1990-01-01"),

    gender:
      "male",

    nationality:
      "Nigerian",

    residentialAddress:
      "15 Validation Test Street, Lagos",

    phoneNumber:
      `+23480${String(Date.now()).slice(-8)}`,

    occupation:
      "Software Tester",

    ...overrides
  };
}

async function expectValidationError({
  application,
  fieldName,
  message
}) {
  let validationError;

  try {
    await application.validate();
  } catch (error) {
    validationError = error;
  }

  assert.ok(
    validationError,
    message
  );

  assert.equal(
    validationError.name,
    "ValidationError"
  );

  assert.ok(
    validationError.errors[fieldName],
    `Expected validation error for ${fieldName}`
  );

  return validationError;
}

/*
 * Pending applications must not have review details.
 */
const pendingApplication =
  new KYCApplication(
    createApplicationData()
  );

assert.equal(
  pendingApplication.applicationStatus,
  APPLICATION_STATUSES.PENDING
);

assert.equal(
  pendingApplication.reviewedBy,
  null
);

assert.equal(
  pendingApplication.reviewDate,
  null
);

assert.equal(
  pendingApplication.reviewComments,
  null
);

await pendingApplication.validate();

const invalidPendingApplication =
  new KYCApplication(
    createApplicationData({
      reviewedBy:
        new mongoose.Types.ObjectId(),

      reviewDate:
        new Date(),

      reviewComments:
        "Administrator reviewed the application."
    })
  );

await expectValidationError({
  application:
    invalidPendingApplication,

  fieldName:
    "applicationStatus",

  message:
    "Pending review metadata was incorrectly accepted"
});

console.log(
  "Pending application review-state validation verified"
);

/*
 * Automated under-review transition requires no
 * Administrator metadata.
 */
const automatedUnderReviewApplication =
  new KYCApplication(
    createApplicationData({
      applicationStatus:
        APPLICATION_STATUSES
          .UNDER_REVIEW
    })
  );

await automatedUnderReviewApplication.validate();
/*
 * Administrator-retained under-review state requires
 * complete review metadata.
 */
const retainedUnderReviewApplication =
  new KYCApplication(
    createApplicationData({
      applicationStatus:
        APPLICATION_STATUSES
          .UNDER_REVIEW,

      reviewedBy:
        new mongoose.Types.ObjectId(),

      reviewDate:
        new Date(),

      reviewComments:
        "Additional verification documents are required."
    })
  );

await retainedUnderReviewApplication.validate();

const incompleteUnderReviewApplication =
  new KYCApplication(
    createApplicationData({
      applicationStatus:
        APPLICATION_STATUSES
          .UNDER_REVIEW,

      reviewedBy:
        new mongoose.Types.ObjectId()
    })
  );

await expectValidationError({
  application:
    incompleteUnderReviewApplication,

  fieldName:
    "applicationStatus",

  message:
    "Incomplete retained-under-review metadata was accepted"
});

console.log(
  "Under-review application metadata validation verified"
);

/*
 * Approved applications require reviewer and date.
 */
const approvedApplication =
  new KYCApplication(
    createApplicationData({
      applicationStatus:
        APPLICATION_STATUSES.APPROVED,

      reviewedBy:
        new mongoose.Types.ObjectId(),

      reviewDate:
        new Date()
    })
  );

await approvedApplication.validate();

const approvedWithoutReviewer =
  new KYCApplication(
    createApplicationData({
      applicationStatus:
        APPLICATION_STATUSES.APPROVED,

      reviewDate:
        new Date()
    })
  );

await expectValidationError({
  application:
    approvedWithoutReviewer,

  fieldName:
    "reviewedBy",

  message:
    "Approved application without reviewer was accepted"
});

const approvedWithoutDate =
  new KYCApplication(
    createApplicationData({
      applicationStatus:
        APPLICATION_STATUSES.APPROVED,

      reviewedBy:
        new mongoose.Types.ObjectId()
    })
  );

await expectValidationError({
  application:
    approvedWithoutDate,

  fieldName:
    "reviewDate",

  message:
    "Approved application without review date was accepted"
});

console.log(
  "Approved application review requirements verified"
);

/*
 * Rejected applications require reviewer, date
 * and meaningful comments.
 */
const rejectedApplication =
  new KYCApplication(
    createApplicationData({
      applicationStatus:
        APPLICATION_STATUSES.REJECTED,

      reviewedBy:
        new mongoose.Types.ObjectId(),

      reviewDate:
        new Date(),

      reviewComments:
        "Submitted identity information could not be verified."
    })
  );

await rejectedApplication.validate();

const rejectedWithoutComments =
  new KYCApplication(
    createApplicationData({
      applicationStatus:
        APPLICATION_STATUSES.REJECTED,

      reviewedBy:
        new mongoose.Types.ObjectId(),

      reviewDate:
        new Date()
    })
  );

await expectValidationError({
  application:
    rejectedWithoutComments,

  fieldName:
    "reviewComments",

  message:
    "Rejected application without comments was accepted"
});

const rejectedWithShortComments =
  new KYCApplication(
    createApplicationData({
      applicationStatus:
        APPLICATION_STATUSES.REJECTED,

      reviewedBy:
        new mongoose.Types.ObjectId(),

      reviewDate:
        new Date(),

      reviewComments:
        "Invalid"
    })
  );

const shortCommentError =
  await expectValidationError({
    application:
      rejectedWithShortComments,

    fieldName:
      "reviewComments",

    message:
      "Short rejection comments were accepted"
  });

assert.equal(
  shortCommentError
    .errors
    .reviewComments
    .kind,
  "minlength"
);

console.log(
  "Rejected application review requirements verified"
);

/*
 * Confirm review-comment schema constraints.
 */
const reviewCommentsPath =
  KYCApplication.schema.path(
    "reviewComments"
  );

assert.equal(
  reviewCommentsPath
    .options
    .minlength[0],
  REVIEW_COMMENT_RULES
    .MIN_REQUIRED_LENGTH
);

assert.equal(
  reviewCommentsPath
    .options
    .maxlength[0],
  REVIEW_COMMENT_RULES.MAX_LENGTH
);

console.log(
  "Review-comment schema limits verified"
);

console.log(
  "Sprint 5 KYC application review validation passed"
);