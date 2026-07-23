import express, { json } from "express";
import cors from "cors";

//import 'dotenv/config';
import { APP_NAME } from "./config/constants.js";
import authRoutes from "./routes/authRoutes.js";
import kycRoutes from "./routes/kycRoutes.js";
import {
  recoverInterruptedOcrProcessing
} from "./services/ocrRecoveryService.js";

import connectDB from "./config/database.js";

if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET");
  process.exit(1);
}

const app = express();

await connectDB();

const recoveryCutoff =
  new Date();

const recoveryResult =
  await recoverInterruptedOcrProcessing({
    interruptedBefore:
      recoveryCutoff
  });

if (
  recoveryResult.modifiedCount > 0
) {
  console.warn(
    `${recoveryResult.modifiedCount} interrupted OCR document(s) marked as failed`
  );
} else {
  console.log(
    "No interrupted OCR processing records found"
  );
}

app.use(cors());
app.use(json());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/applications", kycRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    "success": true,
    "message": "AI-Driven KYC Automation System API Running"
  });
});

app.get("/api/v1", (req, res) => {
  res.status(200).json({
    success: true,
    message: `${APP_NAME} API Running`
  });
});



const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});