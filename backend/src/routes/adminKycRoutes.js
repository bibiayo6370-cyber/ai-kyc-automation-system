import { Router } from "express";

import { getApplicationDetail, getReviewQueue, reviewApplication } from "../controllers/adminKycController.js";

import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate, authorizeRoles("admin"));

router.get("/review-queue", getReviewQueue);

router.get("/applications/:applicationId", getApplicationDetail);

router.patch("/applications/:applicationId/decision", reviewApplication);

export default router;