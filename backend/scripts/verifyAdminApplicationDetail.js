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
  RISK_FACTOR_CODES,
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

import KYCDocument from
  "../src/models/KYCDocument.js";

import RiskAssessment from
  "../src/models/RiskAssessment.js";

import AuditLog from
  "../src/models/AuditLog.js";

import {
  recordApplicationMovedToReview
} from "../src/services/auditLogService.js";

const createdUserIds = [];
const createdApplicationIds = [];

let server;

function uniquePhoneNumber() {
  return `+23480${randomInt(
    10000000,
    99999999
  )}`;
}

async function createUser({
  label,
  role
}) {
  const suffix =
    randomUUID()
      .replaceAll("-", "")
      .slice(0, 12);

  const user =
    await User.create({
      fullName:
        `${label} Detail User`,

      email:
        `${label}-${suffix}@example.com`,

      phoneNumber:
        uniquePhoneNumber(),

      passwordHash:
        "detail-verification-password-hash",

      role,

      status:
        "active"
    });

  createdUserIds.push(
    user._id
  );

  return user;
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
    await createUser({
      label:
        "Administrator",
      role:
        "admin"
    });

  const customer =
    await createUser({
      label:
        "Customer",
      role:
        "customer"
    });

  const application =
    await KYCApplication.create({
      userId:
        customer._id,

      fullName:
        "Sanctioned Test Customer",

      dateOfBirth:
        new Date(
          "1990-01-01"
        ),

      gender:
        "male",

      nationality:
        "Nigerian",

      residentialAddress:
        "25 Administrator Detail Test Street, Lagos",

      phoneNumber:
        uniquePhoneNumber(),

      occupation:
        "Software Tester",

      applicationStatus:
        APPLICATION_STATUSES
          .UNDER_REVIEW
    });

  createdApplicationIds.push(
    application._id
  );

  const document =
    await KYCDocument.create({
      applicationId:
        application._id,

      userId:
        customer._id,

      gridFsFileId:
        new mongoose.Types.ObjectId(),

      documentType:
        "national_id",

      originalName:
        "administrator-detail-test.png",

      mimeType:
        "image/png",

      fileSize:
        1400,

      fileHash:
        randomUUID()
          .replaceAll("-", "")
          .padEnd(64, "0")
          .slice(0, 64),

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

      processingError:
        null
    });

  const assessment =
    await RiskAssessment.create({
      applicationId:
        application._id,

      userId:
        customer._id,

      documentId:
        document._id,

      assessmentStatus:
        ASSESSMENT_STATUSES
          .COMPLETED,

      riskScore:
        100,

      riskLevel:
        RISK_LEVELS.HIGH,

      recommendation:
        RISK_RECOMMENDATIONS
          .ESCALATE,

      reviewRequired:
        true,

      riskFactors: [
        {
          code: RISK_FACTOR_CODES.WATCHLIST_MATCH,
          category: "watchlist",
          severity: "critical",
          scoreImpact: 100,
          description: "The customer name matched the simulated watchlist",
          isOverride: true
        }
      ],

      assessmentReasons: [
        "The customer name matched the simulated watchlist"
      ],

      watchlistScreening: {
        status:
          WATCHLIST_STATUSES.MATCH,

        referenceId:
          "SIM-WL-001",

        matchedName:
          "Sanctioned Test Customer",

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

  await recordApplicationMovedToReview({
    applicationId: application._id,
    customerId: customer._id,
    riskAssessmentId: assessment._id
  });

  const app = express();

  app.use("/api/v1/admin/kyc", adminKycRoutes);

  server = app.listen(0, "127.0.0.1");

  await once(server, "listening");

  const address = server.address();

  assert.equal(typeof address, "object");

  const baseUrl =
    `http://127.0.0.1:${address.port}`;

  const detailResult = await requestJson({
    baseUrl,
    path: `/api/v1/admin/kyc/applications/${application._id}`,
    token: createToken(administrator)
  });
  assert.equal(detailResult.status, 200);
  assert.equal(
    detailResult.body.application.applicationStatus,
    APPLICATION_STATUSES.UNDER_REVIEW
  );
  assert.equal(
    detailResult.body.application.fullName, "Sanctioned Test Customer"
  );
  assert.equal(
    detailResult.body.customer.email, customer.email
  );
  assert.equal(
    "passwordHash" in detailResult.body.customer, false
  );
  console.log("Administrator application and customer details verified");
  assert.equal(
    detailResult.body.document.documentType, "national_id"
  );
  assert.equal(
    detailResult.body.document.ocrStatus, "processed");

  assert.equal(
    detailResult.body.document.extractedText,
    "FULL NAME SANCTIONED TEST CUSTOMER"
  );
  assert.equal(
    "gridFsFileId" in detailResult.body.document, false
  );
  assert.equal(
    "fileHash" in detailResult.body.document, false
  );
  console.log(
    "Administrator OCR and document details verified"
  );

  assert.equal(
    detailResult.body
      .riskAssessment
      .riskScore,
    100
  );

  assert.equal(
    detailResult.body
      .riskAssessment
      .riskLevel,
    RISK_LEVELS.HIGH
  );

  assert.equal(
    detailResult.body
      .riskAssessment
      .watchlistScreening
      .referenceId,
    "SIM-WL-001"
  );

  assert.equal(
    detailResult.body
      .riskAssessment
      .riskFactors[0]
      .code,
    RISK_FACTOR_CODES
      .WATCHLIST_MATCH
  );

  assert.equal(
    detailResult.body
      .riskAssessment
      .rulesVersion,
    RISK_RULES_VERSION
  );

  console.log(
    "Administrator internal risk and watchlist details verified"
  );

  assert.equal(
    detailResult.body.auditTrail.length,
    1
  );

  assert.equal(
    detailResult.body
      .auditTrail[0]
      .action,
    AUDIT_ACTIONS
      .APPLICATION_MOVED_TO_REVIEW
  );

  assert.equal(
    detailResult.body
      .auditTrail[0]
      .actorRole,
    "system"
  );

  assert.equal(
    detailResult.body
      .auditTrail[0]
      .actor,
    null
  );

  console.log(
    "Administrator chronological audit trail verified"
  );

  const malformedResult =
    await requestJson({
      baseUrl,

      path:
        "/api/v1/admin/kyc/applications/not-a-valid-id",

      token:
        createToken(
          administrator
        )
    });

  assert.equal(
    malformedResult.status,
    400
  );

  const missingResult =
    await requestJson({
      baseUrl,

      path:
        `/api/v1/admin/kyc/applications/${new mongoose.Types.ObjectId()}`,

      token:
        createToken(
          administrator
        )
    });

  assert.equal(
    missingResult.status,
    404
  );

  console.log(
    "Administrator application-detail input validation verified"
  );

  const customerResult =
    await requestJson({
      baseUrl,

      path:
        `/api/v1/admin/kyc/applications/${application._id}`,

      token:
        createToken(
          customer
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
        `/api/v1/admin/kyc/applications/${application._id}`
    });

  assert.equal(
    noTokenResult.status,
    401
  );

  console.log(
    "Administrator application-detail access control verified"
  );

  console.log(
    "Sprint 5 administrator application-detail verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 5 administrator application-detail verification failed:",
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
    "Temporary administrator application-detail records removed"
  );

  await mongoose.disconnect();
}