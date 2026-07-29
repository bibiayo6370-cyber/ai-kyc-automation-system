import mongoose from "mongoose";
import connectDB from "../src/config/database.js";
import { ASSESSMENT_STATUSES, RISK_FACTOR_CODES, RISK_LEVELS, RISK_RECOMMENDATIONS, RISK_RULES_VERSION, WATCHLIST_STATUSES } from "../src/config/riskConstants.js";
import User from "../src/models/User.js";
import KYCApplication from "../src/models/KYCApplication.js";
import KYCDocument from "../src/models/KYCDocument.js";
import RiskAssessment from "../src/models/RiskAssessment.js";
import AuditLog from "../src/models/AuditLog.js";
import { APPLICATION_STATUSES } from "../src/config/kycReviewConstants.js";
import { moveApplicationToReviewAfterAssessment } from "../src/services/applicationReviewTransitionService.js";

const SEED_EMAIL = "sprint5-detail-high@example.com";

async function removePreviousSeedRecord() {
  const user = await User.findOne({ email: SEED_EMAIL }).select("_id").lean();

  if (!user) return;

  const application = await KYCApplication.findOne({ userId: user._id }).select("_id").lean();

  if (application) {
    await AuditLog.collection.deleteMany({ applicationId: application._id });
    await RiskAssessment.deleteMany({ applicationId: application._id });
    await KYCDocument.deleteMany({ applicationId: application._id });
    await KYCApplication.deleteOne({ _id: application._id });
  }

  await User.deleteOne({ _id: user._id });
}

async function seedAdministratorApplicationDetail() {
  await connectDB();
  await removePreviousSeedRecord();

  const customer = await User.create({
    fullName: "Sanctioned Test Customer",
    email: SEED_EMAIL,
    phoneNumber: "+2348011111999",
    passwordHash: "controlled-sprint-5-detail-fixture",
    role: "customer",
    status: "active"
  });

  const application = await KYCApplication.create({
    userId: customer._id,
    fullName: "Sanctioned Test Customer",
    dateOfBirth: new Date("1990-01-01"),
    gender: "male",
    nationality: "Nigerian",
    residentialAddress: "25 Administrator Detail Test Street, Lagos",
    phoneNumber: customer.phoneNumber,
    occupation: "Software Tester",
    applicationStatus: APPLICATION_STATUSES.PENDING
  });

  const document = await KYCDocument.create({
    applicationId: application._id,
    userId: customer._id,
    gridFsFileId: new mongoose.Types.ObjectId(),
    documentType: "national_id",
    originalName: "administrator-detail-test.png",
    mimeType: "image/png",
    fileSize: 1400,
    fileHash: "a".repeat(64),
    ocrStatus: "processed",
    extractedText: "FULL NAME SANCTIONED TEST CUSTOMER\nNATIONALITY NIGERIAN\nDOCUMENT TYPE NATIONAL ID",
    ocrConfidence: 95,
    verificationStatus: "matched",
    nameMatchScore: 100,
    processingError: null
  });

  const assessment = await RiskAssessment.create({
    applicationId: application._id,
    userId: customer._id,
    documentId: document._id,
    assessmentStatus: ASSESSMENT_STATUSES.COMPLETED,
    riskScore: 100,
    riskLevel: RISK_LEVELS.HIGH,
    recommendation: RISK_RECOMMENDATIONS.ESCALATE,
    reviewRequired: true,
    riskFactors: [{
      code: RISK_FACTOR_CODES.WATCHLIST_MATCH,
      category: "watchlist",
      severity: "critical",
      scoreImpact: 100,
      description: "The customer name matched the simulated watchlist",
      isOverride: true
    }],
    assessmentReasons: ["The customer name matched the simulated watchlist"],
    watchlistScreening: {
      status: WATCHLIST_STATUSES.MATCH,
      referenceId: "SIM-WL-001",
      matchedName: "Sanctioned Test Customer",
      simulated: true,
      screenedAt: new Date()
    },
    inputSnapshot: {
      documentType: "national_id",
      ocrStatus: "processed",
      extractedTextPresent: true,
      ocrConfidence: 95,
      verificationStatus: "matched",
      nameMatchScore: 100,
      duplicateDocumentDetected: false
    },
    rulesVersion: RISK_RULES_VERSION,
    assessmentError: null,
    assessedAt: new Date()
  });

  const transitioned = await moveApplicationToReviewAfterAssessment({
    applicationId: application._id,
    customerId: customer._id,
    riskAssessmentId: assessment._id
  });

  if (!transitioned) {
    throw new Error("Demonstration application could not enter review");
  }

  console.log("Administrator application-detail record created successfully");
  console.log(`Customer: ${customer.fullName}`);
  console.log(`Application ID: ${application._id}`);
  console.log("Risk: High — 100/100 — Escalate");
}

try {
  await seedAdministratorApplicationDetail();
} catch (error) {
  console.error("Administrator application-detail seeding failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}