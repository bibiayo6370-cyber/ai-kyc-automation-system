import {
  createWorker
} from "tesseract.js";

let workerPromise;
let recognitionQueue =
  Promise.resolve();

function createServiceError(
  message,
  statusCode,
  cause
) {
  const error = new Error(message);

  error.statusCode = statusCode;

  if (cause) {
    error.cause = cause;
  }

  return error;
}

function logProgress(message) {
  if (
    process.env.OCR_LOG_PROGRESS !==
    "true"
  ) {
    return;
  }

  const percentage =
    Number.isFinite(message.progress)
      ? Math.round(
        message.progress * 100
      )
      : null;

  console.log(
    percentage === null
      ? `OCR: ${message.status}`
      : `OCR: ${message.status} ${percentage}%`
  );
}

async function createOcrWorker() {
  try {
    const worker = await createWorker(
      "eng",
      1,
      {
        logger: logProgress
      }
    );

    console.log(
      "Reusable English OCR worker initialized"
    );

    return worker;
  } catch (error) {
    workerPromise = undefined;

    throw createServiceError(
      "Unable to initialize OCR service",
      503,
      error
    );
  }
}

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = createOcrWorker();
  }

  return workerPromise;
}

function normalizeConfidence(confidence) {
  if (!Number.isFinite(confidence)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Number(confidence.toFixed(2))
    )
  );
}

function normalizeExtractedText(text) {
  if (typeof text !== "string") {
    return "";
  }

  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function resetOcrWorker() {
  if (!workerPromise) {
    return;
  }

  try {
    const worker =
      await workerPromise;

    await worker.terminate();
  } catch (error) {
    console.error(
      "OCR worker reset failed:",
      error.message
    );
  } finally {
    workerPromise = undefined;
  }
}

async function performRecognition(buffer) {
  const worker =
    await getOcrWorker();

  try {
    const result =
      await worker.recognize(buffer);

    return {
      extractedText:
        normalizeExtractedText(
          result.data?.text
        ),

      ocrConfidence:
        normalizeConfidence(
          result.data?.confidence
        )
    };
  } catch (error) {
    await resetOcrWorker();

    throw createServiceError(
      "Unable to extract text from document",
      500,
      error
    );
  }
}

export async function recognizeDocument(
  buffer
) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length === 0
  ) {
    throw createServiceError(
      "Document image buffer is required",
      400
    );
  }

  /*
   * Serialize OCR operations because Sprint 3
   * uses one reusable worker.
   */
  const recognitionTask =
    recognitionQueue.then(() =>
      performRecognition(buffer)
    );

  /*
   * Keep the queue operational even when one
   * recognition request fails.
   */
  recognitionQueue =
    recognitionTask.catch(() => undefined);

  return recognitionTask;
}

export async function terminateOcrWorker() {
  await recognitionQueue.catch(
    () => undefined
  );

  if (!workerPromise) {
    return;
  }

  try {
    const worker =
      await workerPromise;

    await worker.terminate();

    console.log(
      "Reusable OCR worker terminated"
    );
  } finally {
    workerPromise = undefined;
    recognitionQueue =
      Promise.resolve();
  }
}