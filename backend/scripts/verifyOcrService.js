import assert from "node:assert/strict";
import {
  readFile
} from "node:fs/promises";

import {
  recognizeDocument,
  terminateOcrWorker
} from
  "../src/services/ocrService.js";

try {
  const imageUrl =
    new URL(
      "../tests/fixtures/ocr-test-document.png",
      import.meta.url
    );

  const imageBuffer =
    await readFile(imageUrl);

  const firstResult =
    await recognizeDocument(
      imageBuffer
    );

  assert.ok(
    firstResult.extractedText,
    "OCR did not extract any text"
  );

  assert.ok(
    firstResult.extractedText
      .toUpperCase()
      .includes("KYC"),
    "Expected test text was not detected"
  );

  assert.ok(
    firstResult.ocrConfidence >= 0 &&
    firstResult.ocrConfidence <= 100,
    "OCR confidence is outside the valid range"
  );

  console.log(
    "First OCR recognition completed successfully"
  );

  console.log(
    `OCR confidence: ${firstResult.ocrConfidence}`
  );

  console.log(
    "Extracted text:"
  );

  console.log(
    firstResult.extractedText
  );

  const secondResult =
    await recognizeDocument(
      imageBuffer
    );

  assert.ok(
    secondResult.extractedText,
    "Reusable worker did not process the second image"
  );

  console.log(
    "Reusable OCR worker processed a second request successfully"
  );

  console.log(
    "Sprint 3 OCR service verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 3 OCR service verification failed:",
    error
  );

  process.exitCode = 1;
} finally {
  await terminateOcrWorker();
}