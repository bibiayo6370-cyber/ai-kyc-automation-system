import { Router } from "express";

import {
  createApplication,
  getMyApplication,
  getApplicationById
} from "../controllers/kycController.js";
import { getApplicationStatus } from "../controllers/customerKycStatusController.js";
import {
  createDocument,
  getDocuments,
  getDocumentById
} from "../controllers/kycDocumentController.js";
import { getRiskAssessment } from "../controllers/riskAssessmentController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  uploadSingleDocument,
  validateDocumentUpload
} from "../middleware/documentUploadMiddleware.js";

const router = Router();

router.use(authenticate);

router.get("/:applicationId/risk-assessment", getRiskAssessment);
router.get("/:applicationId/status", getApplicationStatus);
router.post("/", createApplication);
router.get("/", getMyApplication);
router.post(
  "/:applicationId/documents",
  uploadSingleDocument,
  validateDocumentUpload,
  createDocument
);
router.get("/:applicationId/documents", getDocuments);
router.get("/:applicationId/documents/:documentId", getDocumentById);
router.get("/:id", getApplicationById);

export default router;