import mongoose from "mongoose";
import connectDB from "../src/config/database.js";
import { ASSESSMENT_STATUSES, RISK_LEVELS, RISK_RECOMMENDATIONS, RISK_RULES_VERSION, WATCHLIST_STATUSES } from "../src/config/riskConstants.js";
import { APPLICATION_STATUSES } from "../src/config/kycReviewConstants.js";
import User from "../src/models/User.js";
import KYCApplication from "../src/models/KYCApplication.js";
import RiskAssessment from "../src/models/RiskAssessment.js";
import AuditLog from "../src/models/AuditLog.js";
import { moveApplicationToReviewAfterAssessment } from "../src/services/applicationReviewTransitionService.js";

const SEED_EMAIL_PATTERN = /^sprint5-queue-[a-z]+@example\.com$/i;

const SCENARIOS = [
  {
    key: "high",
    label: "High Risk",
    fullName: "Amina Bello",
    email: "sprint5-queue-high@example.com",
    phoneNumber: "+2348011111001",
    riskScore: 100,
    riskLevel: RISK_LEVELS.HIGH,
    recommendation: RISK_RECOMMENDATIONS.ESCALATE,
    reviewRequired: true
  },
  {
    key: "medium",
    label: "Medium Risk",
    fullName: "Chinedu Okafor",
    email: "sprint5-queue-medium@example.com",
    phoneNumber: "+2348011111002",
    riskScore: 35,
    riskLevel: RISK_LEVELS.MEDIUM,
    recommendation: RISK_RECOMMENDATIONS.MANUAL_REVIEW,
    reviewRequired: true
  },
  {
    key: "low",
    label: "Low Risk",
    fullName: "Funke Adeyemi",
    email: "sprint5-queue-low@example.com",
    phoneNumber: "+2348011111003",
    riskScore: 0,
    riskLevel: RISK_LEVELS.LOW,
    recommendation: RISK_RECOMMENDATIONS.PROCEED,
    reviewRequired: false
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
    await KYCApplication.deleteMany({ _id: { $in: applicationIds } });
  }

  await User.deleteMany({ _id: { $in: userIds } });
}

async function createScenario(scenario) {
  const user = await User.create({
    fullName: scenario.fullName,
    email: scenario.email,
    phoneNumber: scenario.phoneNumber,
    passwordHash: "controlled-sprint-5-queue-fixture",
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

  const assessment = await RiskAssessment.create({
    applicationId: application._id,
    userId: user._id,
    documentId: new mongoose.Types.ObjectId(),
    assessmentStatus: ASSESSMENT_STATUSES.COMPLETED,
    riskScore: scenario.riskScore,
    riskLevel: scenario.riskLevel,
    recommendation: scenario.recommendation,
    reviewRequired: scenario.reviewRequired,
    riskFactors: [],
    assessmentReasons: [`Controlled ${scenario.riskLevel}-risk demonstration record`],
    watchlistScreening: {
      status: WATCHLIST_STATUSES.CLEAR,
      referenceId: null,
      matchedName: null,
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

  for (const scenario of SCENARIOS) {
    await createScenario(scenario);
  }

  console.log("");
  console.log("Sprint 5 Administrator review queue seeded successfully");
  console.log("Created records: High, Medium and Low risk");
} catch (error) {
  console.error("Administrator review queue seeding failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}