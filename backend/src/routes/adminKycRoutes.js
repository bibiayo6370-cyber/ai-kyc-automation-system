import {
  Router
} from "express";

import {
  getReviewQueue
} from "../controllers/adminKycController.js";

import {
  authenticate,
  authorizeRoles
} from "../middleware/authMiddleware.js";

const router =
  Router();

router.use(
  authenticate,
  authorizeRoles("admin")
);

router.get(
  "/review-queue",
  getReviewQueue
);

export default router;