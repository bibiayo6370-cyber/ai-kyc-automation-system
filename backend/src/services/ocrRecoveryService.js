import KYCDocument from
  "../models/KYCDocument.js";

export const INTERRUPTED_OCR_MESSAGE =
  "OCR processing was interrupted before completion";

function validateCutoffDate(
  interruptedBefore
) {
  if (
    !(interruptedBefore instanceof Date) ||
    Number.isNaN(
      interruptedBefore.getTime()
    )
  ) {
    const error = new Error(
      "A valid OCR recovery cutoff date is required"
    );

    error.statusCode = 400;

    throw error;
  }
}

export async function recoverInterruptedOcrProcessing({
  interruptedBefore = new Date()
} = {}) {
  validateCutoffDate(
    interruptedBefore
  );

  const result =
    await KYCDocument.updateMany(
      {
        ocrStatus: "processing",

        updatedAt: {
          $lt: interruptedBefore
        }
      },
      {
        $set: {
          ocrStatus: "failed",

          verificationStatus:
            "failed",

          extractedText: null,

          ocrConfidence: null,

          nameMatchScore: null,

          processingError:
            INTERRUPTED_OCR_MESSAGE
        }
      }
    );

  return {
    matchedCount:
      result.matchedCount ?? 0,

    modifiedCount:
      result.modifiedCount ?? 0
  };
}