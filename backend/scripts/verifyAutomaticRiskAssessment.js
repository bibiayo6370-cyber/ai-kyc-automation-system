import assert from "node:assert/strict";
import {
  randomInt
} from "node:crypto";

import mongoose from "mongoose";
import sharp from "sharp";

import connectDB from
  "../src/config/database.js";

import {
  ASSESSMENT_STATUSES,
  WATCHLIST_STATUSES
} from
  "../src/config/riskConstants.js";

import {
  APPLICATION_STATUSES
} from
  "../src/config/kycReviewConstants.js";

import {
  AUDIT_ACTIONS
} from
  "../src/config/auditLogConstants.js";

import KYCApplication from
  "../src/models/KYCApplication.js";

import KYCDocument from
  "../src/models/KYCDocument.js";

import RiskAssessment from
  "../src/models/RiskAssessment.js";

import AuditLog from
  "../src/models/AuditLog.js";

import {
  processKYCDocument
} from
  "../src/services/kycDocumentService.js";

import {
  assessApplicationRisk
} from
  "../src/services/riskAssessmentService.js";

import {
  terminateOcrWorker
} from
  "../src/services/ocrService.js";

let applicationId = null;

function createUniquePhoneNumber() {
  const suffix =
    randomInt(
      10000000,
      99999999
    );

  return `+23480${suffix}`;
}

async function createTestImage() {
  const svg = `
    <svg
      width="1400"
      height="500"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        width="100%"
        height="100%"
        fill="white"
      />

      <text
        x="70"
        y="120"
        font-family="Arial"
        font-size="48"
        fill="black"
      >
        KYC DOCUMENT TEST
      </text>

      <text
        x="70"
        y="230"
        font-family="Arial"
        font-size="48"
        fill="black"
      >
        FULL NAME: AUTOMATIC RISK TEST CUSTOMER
      </text>

      <text
        x="70"
        y="340"
        font-family="Arial"
        font-size="48"
        fill="black"
      >
        NATIONALITY: NIGERIAN
      </text>
    </svg>
  `;

  return sharp(
    Buffer.from(svg)
  )
    .png()
    .toBuffer();
}

async function deleteGridFsFile(
  fileId
) {
  if (
    !fileId ||
    !mongoose.connection.db
  ) {
    return;
  }

  /*
   * Locate every configured GridFS bucket so the
   * verification cleanup does not depend on a
   * hard-coded bucket name.
   */
  const collections =
    await mongoose.connection.db
      .listCollections()
      .toArray();

  const bucketNames =
    collections
      .map(
        collection =>
          collection.name
      )
      .filter(
        collectionName =>
          collectionName.endsWith(
            ".files"
          )
      )
      .map(
        collectionName =>
          collectionName.slice(
            0,
            -".files".length
          )
      );

  for (
    const bucketName of
    bucketNames
  ) {
    const bucket =
      new mongoose.mongo.GridFSBucket(
        mongoose.connection.db,
        {
          bucketName
        }
      );

    try {
      await bucket.delete(
        fileId
      );

      return;
    } catch {
      /*
       * Continue checking other GridFS buckets.
       * Cleanup errors must not hide the test result.
       */
    }
  }
}

try {
  await connectDB();

  const userId =
    new mongoose.Types.ObjectId();

  const application =
    await KYCApplication.create({
      userId,

      fullName:
        "Automatic Risk Test Customer",

      dateOfBirth:
        new Date(
          "1990-01-01"
        ),

      gender:
        "male",

      nationality:
        "Nigerian",

      residentialAddress:
        "15 Automatic Risk Test Street, Lagos",

      phoneNumber:
        createUniquePhoneNumber(),

      occupation:
        "Software Tester",

      applicationStatus:
        APPLICATION_STATUSES.PENDING
    });

  applicationId =
    application._id;

  console.log(
    "Temporary KYC application created successfully"
  );

  const imageBuffer =
    await createTestImage();

  const processingResult =
    await processKYCDocument({
      applicationId:
        application._id,

      userId,

      documentType:
        "national_id",

      file: {
        originalname:
          "automatic-risk-test.png",

        mimetype:
          "image/png",

        buffer:
          imageBuffer
      }
    });

  assert.ok(
    processingResult,
    "Document-processing result was not returned"
  );

  assert.ok(
    processingResult.document,
    "Processed document was not returned"
  );

  assert.ok(
    processingResult.riskAssessment,
    "Automatic risk assessment was not returned"
  );

  const {
    document,
    riskAssessment
  } = processingResult;

  assert.ok(
    [
      "processed",
      "failed"
    ].includes(
      document.ocrStatus
    ),
    "Document did not reach a final OCR state"
  );

  console.log(
    "Document reached final OCR state successfully"
  );

  assert.equal(
    riskAssessment.assessmentStatus,
    ASSESSMENT_STATUSES.COMPLETED
  );

  assert.equal(
    String(
      riskAssessment.applicationId
    ),
    String(
      application._id
    )
  );

  assert.equal(
    String(
      riskAssessment.userId
    ),
    String(
      userId
    )
  );

  assert.equal(
    String(
      riskAssessment.documentId
    ),
    String(
      document._id
    )
  );

  console.log(
    "Automatic risk assessment executed after OCR"
  );

  /*
   * Confirm that repeating the assessment updates the
   * existing record rather than creating a duplicate.
   */
  const repeatedAssessment =
    await assessApplicationRisk({
      applicationId:
        application._id,

      userId
    });

  assert.equal(
    String(
      repeatedAssessment._id
    ),
    String(
      riskAssessment._id
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
    "Automatic risk assessment persisted idempotently"
  );

  assert.equal(
    repeatedAssessment
      .inputSnapshot
      .documentType,
    "national_id"
  );

  assert.ok(
    [
      "processed",
      "failed"
    ].includes(
      repeatedAssessment
        .inputSnapshot
        .ocrStatus
    )
  );

  assert.equal(
    repeatedAssessment
      .watchlistScreening
      .status,
    WATCHLIST_STATUSES.CLEAR
  );

  assert.equal(
    repeatedAssessment
      .watchlistScreening
      .referenceId,
    null
  );

  assert.equal(
    repeatedAssessment
      .watchlistScreening
      .matchedName,
    null
  );

  assert.equal(
    repeatedAssessment
      .watchlistScreening
      .simulated,
    true
  );

  console.log(
    "Risk assessment input snapshot and watchlist result verified"
  );

  /*
   * Sprint 5 integration:
   * A completed assessment must automatically move the
   * application from pending to under review.
   */
  const transitionedApplication =
    await KYCApplication.findById(
      application._id
    );

  assert.ok(
    transitionedApplication,
    "Transitioned KYC application was not found"
  );

  assert.equal(
    transitionedApplication
      .applicationStatus,
    APPLICATION_STATUSES
      .UNDER_REVIEW
  );

  assert.equal(
    transitionedApplication.reviewedBy,
    null
  );

  assert.equal(
    transitionedApplication.reviewDate,
    null
  );

  assert.equal(
    transitionedApplication.reviewComments,
    null
  );

  /*
   * The status transition must also create one
   * system-generated audit event linked to the risk
   * assessment that triggered the transition.
   */
  const transitionAudit =
    await AuditLog.findOne({
      applicationId:
        application._id,

      action:
        AUDIT_ACTIONS
          .APPLICATION_MOVED_TO_REVIEW
    });

  assert.ok(
    transitionAudit,
    "Automatic review-transition audit was not created"
  );

  assert.equal(
    String(
      transitionAudit.customerId
    ),
    String(
      userId
    )
  );

  assert.equal(
    String(
      transitionAudit
        .riskAssessmentId
    ),
    String(
      riskAssessment._id
    )
  );

  assert.equal(
    transitionAudit.previousStatus,
    APPLICATION_STATUSES.PENDING
  );

  assert.equal(
    transitionAudit.newStatus,
    APPLICATION_STATUSES
      .UNDER_REVIEW
  );

  assert.equal(
    await AuditLog.countDocuments({
      applicationId:
        application._id,

      action:
        AUDIT_ACTIONS
          .APPLICATION_MOVED_TO_REVIEW
    }),
    1
  );

  console.log(
    "Automatic application review transition and audit verified"
  );

  console.log(
    "Sprint 4 automatic risk assessment integration passed"
  );
} catch (error) {
  console.error(
    "Automatic risk assessment verification failed:",
    error
  );

  process.exitCode =
    1;
} finally {
  /*
   * Terminate the reusable worker before database
   * disconnection.
   */
  await terminateOcrWorker()
    .catch(
      () => undefined
    );

  if (applicationId) {
    const documents =
      await KYCDocument.find({
        applicationId
      }).lean()
        .catch(
          () => []
        );

    for (
      const document of
      documents
    ) {
      await deleteGridFsFile(
        document.gridFsFileId
      );
    }

    /*
     * AuditLog model deletions are intentionally blocked,
     * so verification cleanup uses the native collection.
     */
    await AuditLog.collection
      .deleteMany({
        applicationId
      })
      .catch(
        () => undefined
      );

    await RiskAssessment.deleteMany({
      applicationId
    }).catch(
      () => undefined
    );

    await KYCDocument.deleteMany({
      applicationId
    }).catch(
      () => undefined
    );

    await KYCApplication.deleteOne({
      _id:
        applicationId
    }).catch(
      () => undefined
    );
  }

  console.log(
    "Temporary automatic-risk records removed"
  );

  await mongoose.disconnect();
}