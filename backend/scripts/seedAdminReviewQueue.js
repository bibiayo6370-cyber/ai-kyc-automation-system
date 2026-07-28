import mongoose from "mongoose";
import connectDB from "../src/config/database.js";
import { ASSESSMENT_STATUSES, RISK_LEVELS, RISK_RECOMMENDATIONS, RISK_RULES_VERSION, WATCHLIST_STATUSES, RISK_FACTOR_CODES } from "../src/config/riskConstants.js";
import { APPLICATION_STATUSES } from "../src/config/kycReviewConstants.js";
import User from "../src/models/User.js";
import KYCApplication from "../src/models/KYCApplication.js";
import RiskAssessment from "../src/models/RiskAssessment.js";
import AuditLog from "../src/models/AuditLog.js";
import { moveApplicationToReviewAfterAssessment } from "../src/services/applicationReviewTransitionService.js";
import KYCDocument from "../src/models/KYCDocument.js";
import bcrypt from "bcryptjs";

const SEED_EMAIL_PATTERN = /^sprint5-queue-[a-z]+@example\.com$/i;

const PASSWORD = "Password123";

const SCENARIOS = [
  {
    key: "high",
    label: "High Risk",
    fullName: "Amina Bello",
    email: "sprint5-queue-high@example.com",
    phoneNumber: "+2348011111001",
    documentHash: "1".repeat(64),
    riskScore: 100,
    riskLevel: RISK_LEVELS.HIGH,
    recommendation: RISK_RECOMMENDATIONS.ESCALATE,
    reviewRequired: true,
    watchlistStatus: WATCHLIST_STATUSES.MATCH,
    watchlistReferenceId: "SIM-WL-QUEUE-001",
    watchlistMatchedName: "Amina Bello"
  },
  {
    key: "medium",
    label: "Medium Risk",
    fullName: "Chinedu Okafor",
    email: "sprint5-queue-medium@example.com",
    phoneNumber: "+2348011111002",
    documentHash: "2".repeat(64),
    riskScore: 35,
    riskLevel: RISK_LEVELS.MEDIUM,
    recommendation: RISK_RECOMMENDATIONS.MANUAL_REVIEW,
    reviewRequired: true,
    watchlistStatus: WATCHLIST_STATUSES.CLEAR,
    watchlistReferenceId: null,
    watchlistMatchedName: null
  },
  {
    key: "low",
    label: "Low Risk",
    fullName: "Funke Adeyemi",
    email: "sprint5-queue-low@example.com",
    phoneNumber: "+2348011111003",
    documentHash: "3".repeat(64),
    riskScore: 0,
    riskLevel: RISK_LEVELS.LOW,
    recommendation: RISK_RECOMMENDATIONS.PROCEED,
    reviewRequired: false,
    watchlistStatus: WATCHLIST_STATUSES.CLEAR,
    watchlistReferenceId: null,
    watchlistMatchedName: null
  }
];

async function removePreviousSeedRecords() {
  const users = await User.find({ email: SEED_EMAIL_PATTERN }).select("_id").lean();
  const userIds = users.map((user) => user._id);

  if (userIds.length === 0) return;

  const applications = await KYCApplication.find({ userId: { $in: userIds } }).select("_id").lean();
  const applicationIds = applications.map((application) => application._id);

  if (applicationIds.length > 0) {
    await AuditLog.collection.deleteMany({ applicationId: { $in: applicationIds } });
    await RiskAssessment.deleteMany({ applicationId: { $in: applicationIds } });
    await KYCDocument.deleteMany({ applicationId: { $in: applicationIds } });
    await KYCApplication.deleteMany({ _id: { $in: applicationIds } });
  }

  await User.deleteMany({ _id: { $in: userIds } });
}

async function createScenario(scenario, passwordHash) {
  const user = await User.create({
    fullName: scenario.fullName,
    email: scenario.email,
    phoneNumber: scenario.phoneNumber,
    passwordHash: passwordHash,
    role: "customer",
    status: "active"
  });

  const application = await KYCApplication.create({
    userId: user._id,
    fullName: scenario.fullName,
    dateOfBirth: new Date("1990-01-01"),
    gender: "male",
    nationality: "Nigerian",
    residentialAddress: `${scenario.label} Demonstration Street, Lagos`,
    phoneNumber: scenario.phoneNumber,
    occupation: "Business Professional",
    applicationStatus: APPLICATION_STATUSES.PENDING
  });

  const document = await KYCDocument.create({
    applicationId: application._id,
    userId: user._id,
    gridFsFileId: new mongoose.Types.ObjectId(),
    documentType: "national_id",
    originalName: `${scenario.key}-risk-national-id.png`,
    mimeType: "image/png",
    fileSize: 1400,
    fileHash: scenario.documentHash,
    ocrStatus: "processed",
    extractedText: [
      `FULL NAME: ${scenario.fullName.toUpperCase()}`,
      "NATIONALITY: NIGERIAN",
      "DOCUMENT TYPE: NATIONAL ID"
    ].join("\n"),
    ocrConfidence: 95,
    verificationStatus: "matched",
    nameMatchScore: 100,
    processingError: null
  });

  const isWatchlistMatch =
    scenario.watchlistStatus === WATCHLIST_STATUSES.MATCH;

  const riskFactors = isWatchlistMatch
    ? [{
      code: RISK_FACTOR_CODES.WATCHLIST_MATCH,
      category: "watchlist",
      severity: "critical",
      scoreImpact: 100,
      description: "The customer name matched the simulated watchlist",
      isOverride: true
    }]
    : [];

  const assessmentReasons = isWatchlistMatch
    ? ["The customer name matched the simulated watchlist"]
    : [`Controlled ${scenario.riskLevel}-risk demonstration record`];

  const assessment = await RiskAssessment.create({
    applicationId: application._id,
    userId: user._id,
    documentId: document._id,
    assessmentStatus: ASSESSMENT_STATUSES.COMPLETED,
    riskScore: scenario.riskScore,
    riskLevel: scenario.riskLevel,
    recommendation: scenario.recommendation,
    reviewRequired: scenario.reviewRequired,
    riskFactors,
    assessmentReasons,
    watchlistScreening: {
      status: scenario.watchlistStatus,
      referenceId: scenario.watchlistReferenceId,
      matchedName: scenario.watchlistMatchedName,
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
    customerId: user._id,
    riskAssessmentId: assessment._id
  });

  if (!transitioned) {
    throw new Error(`${scenario.label} application could not enter review`);
  }

  console.log(`${scenario.label} queue record created`);
  console.log(`Customer: ${scenario.fullName}`);
  console.log(`Application ID: ${application._id}`);
}

try {
  await connectDB();
  await removePreviousSeedRecords();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);


  for (const scenario of SCENARIOS) {
    await createScenario(scenario, passwordHash);
  }

  console.log("");
  console.log("Sprint 5 Administrator review queue seeded successfully");
  console.log("Created records: High, Medium and Low risk");
  console.log(`Shared customer password: ${PASSWORD}`);
} catch (error) {
  console.error("Administrator review queue seeding failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}