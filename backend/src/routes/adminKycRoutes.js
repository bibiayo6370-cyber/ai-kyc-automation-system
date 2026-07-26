import { Router } from "express";

import { getApplicationDetail, getReviewQueue } from "../controllers/adminKycController.js";

import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate, authorizeRoles("admin"));

router.get("/review-queue", getReviewQueue);

router.get("/applications/:applicationId", getApplicationDetail);

export default router;