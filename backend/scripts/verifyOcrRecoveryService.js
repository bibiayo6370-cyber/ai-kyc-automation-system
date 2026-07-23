import assert from "node:assert/strict";

import mongoose from "mongoose";

import connectDB from
  "../src/config/database.js";

import KYCApplication from
  "../src/models/KYCApplication.js";

import KYCDocument from
  "../src/models/KYCDocument.js";

import {
  recoverInterruptedOcrProcessing,
  INTERRUPTED_OCR_MESSAGE
} from
  "../src/services/ocrRecoveryService.js";

let applicationId;
let documentId;

try {
  await connectDB();

  const userId =
    new mongoose.Types.ObjectId();

  const application =
    await KYCApplication.create({
      userId,

      fullName:
        "Recovery Test Customer",

      dateOfBirth:
        new Date("1990-01-01"),

      gender:
        "male",

      nationality:
        "Nigerian",

      residentialAddress:
        "1 Recovery Test Street, Lagos",

      phoneNumber:
        "+2348099999999",

      occupation:
        "Software Tester",

      applicationStatus:
        "pending"
    });

  applicationId =
    application._id;

  const document =
    await KYCDocument.create({
      applicationId:
        application._id,

      userId,

      gridFsFileId:
        new mongoose.Types.ObjectId(),

      documentType:
        "national_id",

      originalName:
        "interrupted-processing-test.png",

      mimeType:
        "image/png",

      fileSize:
        100,

      fileHash:
        "a".repeat(64),

      ocrStatus:
        "processing",

      verificationStatus:
        "pending"
    });

  documentId =
    document._id;

  /*
   * Backdate this test record directly so the
   * recovery query targets only this fixture.
   */
  await KYCDocument.collection.updateOne(
    {
      _id: document._id
    },
    {
      $set: {
        updatedAt:
          new Date(
            "2000-01-01T00:00:00.000Z"
          )
      }
    }
  );

  console.log(
    "Interrupted OCR test record created"
  );

  const recoveryResult =
    await recoverInterruptedOcrProcessing({
      interruptedBefore:
        new Date(
          "2001-01-01T00:00:00.000Z"
        )
    });

  assert.equal(
    recoveryResult.modifiedCount,
    1
  );

  const recoveredDocument =
    await KYCDocument.findById(
      document._id
    );

  assert.equal(
    recoveredDocument.ocrStatus,
    "failed"
  );

  assert.equal(
    recoveredDocument
      .verificationStatus,
    "failed"
  );

  assert.equal(
    recoveredDocument.extractedText,
    null
  );

  assert.equal(
    recoveredDocument.ocrConfidence,
    null
  );

  assert.equal(
    recoveredDocument.nameMatchScore,
    null
  );

  assert.equal(
    recoveredDocument.processingError,
    INTERRUPTED_OCR_MESSAGE
  );

  console.log(
    "Interrupted OCR record marked as failed successfully"
  );

  const secondRecovery =
    await recoverInterruptedOcrProcessing({
      interruptedBefore:
        new Date(
          "2001-01-01T00:00:00.000Z"
        )
    });

  assert.equal(
    secondRecovery.modifiedCount,
    0
  );

  console.log(
    "OCR recovery idempotency verified"
  );

  console.log(
    "Sprint 3 OCR recovery verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 3 OCR recovery verification failed:",
    error
  );

  process.exitCode = 1;
} finally {
  if (documentId) {
    await KYCDocument.findByIdAndDelete(
      documentId
    );
  }

  if (applicationId) {
    await KYCApplication.findByIdAndDelete(
      applicationId
    );
  }

  console.log(
    "Temporary OCR recovery records removed"
  );

  await mongoose.disconnect();
}