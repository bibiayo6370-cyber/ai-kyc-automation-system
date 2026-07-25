import assert from "node:assert/strict";

import mongoose from "mongoose";
import sharp from "sharp";

import connectDB from
  "../src/config/database.js";

import KYCApplication from
  "../src/models/KYCApplication.js";

import KYCDocument from
  "../src/models/KYCDocument.js";

import RiskAssessment from
  "../src/models/RiskAssessment.js";

import {
  deleteDocumentFile
} from
  "../src/services/gridFsService.js";

import {
  processKYCDocument
} from
  "../src/services/kycDocumentService.js";

import {
  terminateOcrWorker
} from
  "../src/services/ocrService.js";

let applicationId;

async function createUniqueTestImage() {
  const uniqueReference =
    Date.now();

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
        y="180"
        font-family="Arial"
        font-size="72"
        fill="black"
      >
        NAME AUTO RISK TEST CUSTOMER
      </text>

      <text
        x="70"
        y="310"
        font-family="Arial"
        font-size="48"
        fill="black"
      >
        REFERENCE ${uniqueReference}
      </text>
    </svg>
  `;

  return sharp(
    Buffer.from(svg)
  )
    .png()
    .toBuffer();
}

try {
  await connectDB();

  const userId =
    new mongoose.Types.ObjectId();

  const application =
    await KYCApplication.create({
      userId,

      fullName:
        "Auto Risk Test Customer",

      dateOfBirth:
        new Date(
          "1990-01-01"
        ),

      gender:
        "male",

      nationality:
        "Nigerian",

      residentialAddress:
        "10 Automatic Risk Test Street, Lagos",

      phoneNumber:
        "+2348012345678",

      occupation:
        "Software Tester",

      applicationStatus:
        "pending"
    });

  applicationId =
    application._id;

  const imageBuffer =
    await createUniqueTestImage();

  const result =
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

        size:
          imageBuffer.length,

        buffer:
          imageBuffer
      }
    });

  assert.ok(
    result,
    "The document-processing result was not returned"
  );

  assert.ok(
    result.document,
    "The processed document was not returned"
  );

  assert.equal(
    result.document.ocrStatus,
    "processed"
  );

  console.log(
    "Document reached final OCR state successfully"
  );

  assert.ok(
    result.riskAssessment,
    "Automatic risk assessment was not returned"
  );

  assert.equal(
    result.riskAssessment
      .assessmentStatus,
    "completed"
  );

  assert.equal(
    String(
      result.riskAssessment
        .applicationId
    ),
    String(
      application._id
    )
  );

  assert.equal(
    String(
      result.riskAssessment
        .userId
    ),
    String(userId)
  );

  assert.equal(
    String(
      result.riskAssessment
        .documentId
    ),
    String(
      result.document._id
    )
  );

  assert.ok(
    Number.isFinite(
      result.riskAssessment
        .riskScore
    )
  );

  assert.ok(
    [
      "low",
      "medium",
      "high"
    ].includes(
      result.riskAssessment
        .riskLevel
    )
  );

  console.log(
    "Automatic risk assessment executed after OCR"
  );

  const persistedAssessment =
    await RiskAssessment.findOne({
      applicationId:
        application._id
    });

  assert.ok(
    persistedAssessment,
    "Risk assessment was not persisted"
  );

  assert.equal(
    String(
      persistedAssessment._id
    ),
    String(
      result.riskAssessment._id
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

  assert.ok(
    persistedAssessment
      .inputSnapshot,
    "Risk assessment input snapshot was not stored"
  );

  assert.equal(
    persistedAssessment
      .inputSnapshot
      .ocrStatus,
    "processed"
  );

  assert.equal(
    persistedAssessment
      .inputSnapshot
      .documentType,
    "national_id"
  );

  assert.equal(
    persistedAssessment
      .watchlistScreening
      .simulated,
    true
  );

  assert.ok(
    persistedAssessment
      .watchlistScreening
      .screenedAt
  );

  assert.equal(
    persistedAssessment
      .rulesVersion,
    "1.0"
  );

  console.log(
    "Risk assessment input snapshot and watchlist result verified"
  );

  console.log(
    "Sprint 4 automatic risk assessment integration passed"
  );
} catch (error) {
  console.error(
    "Sprint 4 automatic risk assessment integration failed:",
    error
  );

  process.exitCode = 1;
} finally {
  /*
   * Cleanup by application ID so temporary files
   * are removed even when an assertion fails before
   * document IDs are assigned.
   */
  if (applicationId) {
    await RiskAssessment.deleteMany({
      applicationId
    }).catch(() => undefined);

    const temporaryDocuments =
      await KYCDocument.find({
        applicationId
      }).catch(() => []);

    for (
      const temporaryDocument of
      temporaryDocuments
    ) {
      if (
        temporaryDocument.gridFsFileId
      ) {
        await deleteDocumentFile(
          temporaryDocument.gridFsFileId
        ).catch(() => undefined);
      }
    }

    await KYCDocument.deleteMany({
      applicationId
    }).catch(() => undefined);

    await KYCApplication
      .findByIdAndDelete(
        applicationId
      )
      .catch(() => undefined);
  }

  await terminateOcrWorker()
    .catch(() => undefined);

  console.log(
    "Temporary automatic-risk records removed"
  );

  await mongoose.disconnect();
}