import mongoose from "mongoose";

const DOCUMENT_TYPES = [
  "national_id",
  "passport",
  "drivers_license",
  "voters_card",
  "utility_bill"
];

const MIME_TYPES = [
  "image/jpeg",
  "image/png"
];

const OCR_STATUSES = [
  "pending",
  "processing",
  "processed",
  "failed"
];

const VERIFICATION_STATUSES = [
  "pending",
  "matched",
  "needs_review",
  "failed"
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const kycDocumentSchema =
  new mongoose.Schema(
    {
      applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "KYCApplication",
        required: [
          true,
          "KYC application ID is required"
        ],
        unique: true,
        immutable: true
      },

      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [
          true,
          "User ID is required"
        ],
        immutable: true,
        index: true
      },

      gridFsFileId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [
          true,
          "GridFS file ID is required"
        ],
        unique: true,
        immutable: true
      },

      documentType: {
        type: String,
        required: [
          true,
          "Document type is required"
        ],
        enum: {
          values: DOCUMENT_TYPES,
          message:
            "{VALUE} is not a supported document type"
        },
        immutable: true
      },

      originalName: {
        type: String,
        required: [
          true,
          "Original filename is required"
        ],
        trim: true,
        maxlength: [
          255,
          "Original filename cannot exceed 255 characters"
        ],
        immutable: true
      },

      mimeType: {
        type: String,
        required: [
          true,
          "File MIME type is required"
        ],
        enum: {
          values: MIME_TYPES,
          message:
            "{VALUE} is not a supported file type"
        },
        immutable: true
      },

      fileSize: {
        type: Number,
        required: [
          true,
          "File size is required"
        ],
        min: [
          1,
          "Uploaded document cannot be empty"
        ],
        max: [
          MAX_FILE_SIZE,
          "Uploaded document cannot exceed 5 MB"
        ],
        immutable: true
      },

      fileHash: {
        type: String,
        required: [
          true,
          "File integrity hash is required"
        ],
        trim: true,
        lowercase: true,
        match: [
          /^[a-f0-9]{64}$/,
          "File hash must be a valid SHA-256 value"
        ],
        immutable: true,
        index: true
      },

      ocrStatus: {
        type: String,
        enum: {
          values: OCR_STATUSES,
          message:
            "{VALUE} is not a valid OCR status"
        },
        default: "pending",
        index: true
      },

      extractedText: {
        type: String,
        default: null
      },

      ocrConfidence: {
        type: Number,
        min: [
          0,
          "OCR confidence cannot be below 0"
        ],
        max: [
          100,
          "OCR confidence cannot exceed 100"
        ],
        default: null
      },

      verificationStatus: {
        type: String,
        enum: {
          values: VERIFICATION_STATUSES,
          message:
            "{VALUE} is not a valid verification status"
        },
        default: "pending",
        index: true
      },

      nameMatchScore: {
        type: Number,
        min: [
          0,
          "Name match score cannot be below 0"
        ],
        max: [
          100,
          "Name match score cannot exceed 100"
        ],
        default: null
      },

      processingError: {
        type: String,
        maxlength: [
          1000,
          "Processing error cannot exceed 1000 characters"
        ],
        default: null
      }
    },
    {
      timestamps: true
    }
  );

const KYCDocument = mongoose.model(
  "KYCDocument",
  kycDocumentSchema
);

export default KYCDocument;