import multer from "multer";
import { createWorker } from "tesseract.js";

let worker;

try {
  const storage = multer.memoryStorage();

  const upload = multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024
    }
  });

  if (typeof upload.single !== "function") {
    throw new Error(
      "Multer single-file middleware is unavailable"
    );
  }

  console.log(
    "Multer memory storage initialized successfully"
  );

  worker = await createWorker("eng");

  console.log(
    "Tesseract.js English OCR worker initialized successfully"
  );

  console.log(
    "Sprint 3 dependency verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 3 dependency verification failed:",
    error.message
  );

  process.exitCode = 1;
} finally {
  if (worker) {
    await worker.terminate();

    console.log(
      "Tesseract.js worker terminated successfully"
    );
  }
}