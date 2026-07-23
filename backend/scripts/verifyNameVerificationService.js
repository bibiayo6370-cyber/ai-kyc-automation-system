import assert from "node:assert/strict";

import {
  verifyNameInOcrText
} from
  "../src/services/nameVerificationService.js";

try {
  const exactMatch =
    verifyNameInOcrText(
      "Test Customer",
      `
        KYC DOCUMENT TEST
        FULL NAME: TEST CUSTOMER
        NATIONALITY: NIGERIAN
      `
    );

  assert.equal(
    exactMatch.verificationStatus,
    "matched"
  );

  assert.equal(
    exactMatch.nameMatchScore,
    100
  );

  console.log(
    "Exact OCR name match verified"
  );

  const reorderedMatch =
    verifyNameInOcrText(
      "Babajide Ibiayo",
      "SURNAME: IBIAYO GIVEN NAME: BABAJIDE"
    );

  assert.equal(
    reorderedMatch.verificationStatus,
    "matched"
  );

  assert.equal(
    reorderedMatch.nameMatchScore,
    100
  );

  console.log(
    "Reordered OCR name match verified"
  );

  const partialMatch =
    verifyNameInOcrText(
      "Adaeze Chiamaka Okafor",
      "NAME: ADAEZE OKAFOR"
    );

  assert.equal(
    partialMatch.verificationStatus,
    "needs_review"
  );

  assert.equal(
    partialMatch.nameMatchScore,
    66.67
  );

  assert.deepEqual(
    partialMatch.missingTokens,
    ["CHIAMAKA"]
  );

  console.log(
    "Partial OCR name match correctly flagged for review"
  );

  const emptyOcrResult =
    verifyNameInOcrText(
      "Test Customer",
      ""
    );

  assert.equal(
    emptyOcrResult.verificationStatus,
    "needs_review"
  );

  assert.equal(
    emptyOcrResult.nameMatchScore,
    0
  );

  console.log(
    "Empty OCR text correctly flagged for review"
  );

  const titledName =
    verifyNameInOcrText(
      "Dr Test Customer",
      "FULL NAME TEST CUSTOMER"
    );

  assert.equal(
    titledName.verificationStatus,
    "matched"
  );

  assert.equal(
    titledName.nameMatchScore,
    100
  );

  console.log(
    "Common name title exclusion verified"
  );

  console.log(
    "Sprint 3 OCR name verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 3 OCR name verification failed:",
    error
  );

  process.exitCode = 1;
}