import { Router } from "express";

import {
  createApplication,
  getMyApplication,
  getApplicationById
} from "../controllers/kycController.js";

import {
  authenticate
} from "../middleware/authMiddleware.js";

const router = Router();

// All KYC application routes require authentication.
router.use(authenticate);

router.post(
  "/",
  createApplication
);

router.get(
  "/",
  getMyApplication
);

router.get(
  "/:id",
  getApplicationById
);

export default router;