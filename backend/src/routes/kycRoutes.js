import { Router } from "express";

import {
  createApplication,
  getMyApplication,
  getApplicationById
} from "../controllers/kycController.js";

import {
  authenticate
} from "../middleware/authMiddleware.js";

import {
  createDocument,
  getDocuments,
  getDocumentById
} from
  "../controllers/kycDocumentController.js";

import {
  uploadSingleDocument,
  validateDocumentUpload
} from
  "../middleware/documentUploadMiddleware.js";

import {
  getRiskAssessment
} from
  "../controllers/riskAssessmentController.js";

const router = Router();

// All KYC application routes require authentication.
router.use(authenticate);

router.get(
  "/:applicationId/risk-assessment",
  getRiskAssessment
);

router.post(
  "/",
  createApplication
);

router.get(
  "/",
  getMyApplication
);

router.post(
  "/:applicationId/documents",
  uploadSingleDocument,
  validateDocumentUpload,
  createDocument
);

router.get(
  "/:applicationId/documents",
  getDocuments
);

router.get(
  "/:applicationId/documents/:documentId",
  getDocumentById
);

router.get(
  "/:id",
  getApplicationById
);


export default router;