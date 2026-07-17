import { Router } from "express";

import {
  createApplication,
  getMyApplication
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

export default router;