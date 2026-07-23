import assert from "node:assert/strict";
import {
  readFile
} from "node:fs/promises";

import sharp from "sharp";

import {
  validateDecodableImage
} from
  "../src/services/imageValidationService.js";

function isRejectedImage(error) {
  return (
    error?.statusCode === 415 &&
    typeof error.message === "string"
  );
}

try {
  const validPngUrl =
    new URL(
      "../tests/fixtures/ocr-test-document.png",
      import.meta.url
    );

  const malformedPngUrl =
    new URL(
      "../tests/fixtures/invalid-ocr-image.png",
      import.meta.url
    );

  const disguisedTextUrl =
    new URL(
      "../tests/fixtures/ocr-test-document.txt.png",
      import.meta.url
    );

  const validPngBuffer =
    await readFile(validPngUrl);

  const validPngResult =
    await validateDecodableImage(
      validPngBuffer,
      "image/png"
    );

  assert.equal(
    validPngResult.format,
    "png"
  );

  assert.equal(
    validPngResult.mimeType,
    "image/png"
  );

  assert.ok(
    validPngResult.width > 0 &&
    validPngResult.height > 0
  );

  console.log(
    "Valid PNG decoded successfully"
  );

  /*
   * Generate a valid JPEG in memory from the
   * existing valid PNG fixture.
   */
  const validJpegBuffer =
    await sharp(validPngBuffer)
      .jpeg({
        quality: 90
      })
      .toBuffer();

  const validJpegResult =
    await validateDecodableImage(
      validJpegBuffer,
      "image/jpeg"
    );

  assert.equal(
    validJpegResult.format,
    "jpeg"
  );

  assert.equal(
    validJpegResult.mimeType,
    "image/jpeg"
  );

  console.log(
    "Valid JPEG decoded successfully"
  );

  const malformedPngBuffer =
    await readFile(
      malformedPngUrl
    );

  await assert.rejects(
    () =>
      validateDecodableImage(
        malformedPngBuffer,
        "image/png"
      ),
    isRejectedImage
  );

  console.log(
    "Malformed PNG correctly rejected"
  );

  const disguisedTextBuffer =
    await readFile(
      disguisedTextUrl
    );

  await assert.rejects(
    () =>
      validateDecodableImage(
        disguisedTextBuffer,
        "image/png"
      ),
    isRejectedImage
  );

  console.log(
    "Text file disguised as PNG correctly rejected"
  );

  await assert.rejects(
    () =>
      validateDecodableImage(
        validPngBuffer,
        "image/jpeg"
      ),
    (error) =>
      error.statusCode === 415 &&
      error.message ===
      "The uploaded file content does not match its declared image type"
  );

  console.log(
    "Declared MIME mismatch correctly rejected"
  );

  /*
   * Generate a valid PNG whose dimensions exceed
   * the approved 25-million-pixel limit.
   */
  const excessivePixelBuffer =
    await sharp({
      create: {
        width: 5001,
        height: 5000,
        channels: 3,
        background: {
          r: 255,
          g: 255,
          b: 255
        }
      }
    })
      .png({
        compressionLevel: 9
      })
      .toBuffer();

  await assert.rejects(
    () =>
      validateDecodableImage(
        excessivePixelBuffer,
        "image/png"
      ),
    isRejectedImage
  );

  console.log(
    "Excessive image dimensions correctly rejected"
  );

  console.log(
    "Sprint 3 image validation verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 3 image validation verification failed:",
    error
  );

  if (error?.cause) {
    console.error(
      "Underlying Sharp error:",
      error.cause.message
    );
  }

  process.exitCode = 1;
}