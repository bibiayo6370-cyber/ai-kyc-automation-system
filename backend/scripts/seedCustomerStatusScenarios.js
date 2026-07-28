import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "../src/config/database.js";
import { APPLICATION_STATUSES } from "../src/config/kycReviewConstants.js";
import { ASSESSMENT_STATUSES, RISK_LEVELS, RISK_RECOMMENDATIONS, RISK_RULES_VERSION, WATCHLIST_STATUSES } from "../src/config/riskConstants.js";
import AuditLog from "../src/models/AuditLog.js";
import KYCApplication from "../src/models/KYCApplication.js";
import RiskAssessment from "../src/models/RiskAssessment.js";
import User from "../src/models/User.js";

const PASSWORD = "Password123";
const EMAIL_PATTERN = /^sprint5-status-[a-z]+@example\.com$/i;

const SCENARIOS = [
  { key: "pending", fullName: "Pending Status Customer", email: "sprint5-status-pending@example.com", phoneNumber: "+2348022221001", status: APPLICATION_STATUSES.PENDING },
  { key: "review", fullName: "Review Status Customer", email: "sprint5-status-review@example.com", phoneNumber: "+2348022221002", status: APPLICATION_STATUSES.UNDER_REVIEW, riskScore: 35, riskLevel: RISK_LEVELS.MEDIUM, recommendation: RISK_RECOMMENDATIONS.MANUAL_REVIEW, reviewRequired: true },
  { key: "approved", fullName: "Approved Status Customer", email: "sprint5-status-approved@example.com", phoneNumber: "+2348022221003", status: APPLICATION_STATUSES.APPROVED, riskScore: 0, riskLevel: RISK_LEVELS.LOW, recommendation: RISK_RECOMMENDATIONS.PROCEED, reviewRequired: false, reviewComments: "Identity verification completed successfully." },
  { key: "rejected", fullName: "Rejected Status Customer", email: "sprint5-status-rejected@example.com", phoneNumber: "+2348022221004", status: APPLICATION_STATUSES.REJECTED, riskScore: 100, riskLevel: RISK_LEVELS.HIGH, recommendation: RISK_RECOMMENDATIONS.ESCALATE, reviewRequired: true, reviewComments: "The submitted identity information requires further resolution." }
];

async function removePreviousScenarios() {
  const users = await User.find({ email: EMAIL_PATTERN }).select("_id").lean();
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

async function createAssessment({ scenario, application, customer }) {
  if (scenario.status === APPLICATION_STATUSES.PENDING) return;

  await RiskAssessment.create({
    applicationId: application._id,
    userId: customer._id,
    documentId: new mongoose.Types.ObjectId(),
    assessmentStatus: ASSESSMENT_STATUSES.COMPLETED,
    riskScore: scenario.riskScore,
    riskLevel: scenario.riskLevel,
    recommendation: scenario.recommendation,
    reviewRequired: scenario.reviewRequired,
    riskFactors: [],
    assessmentReasons: [
      scenario.riskLevel === RISK_LEVELS.HIGH
        ? "The application requires additional identity resolution."
        : "Automated identity checks were completed."
    ],
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
}

async function createScenario({ scenario, administrator, passwordHash }) {
  const customer = await User.create({
    fullName: scenario.fullName,
    email: scenario.email,
    phoneNumber: scenario.phoneNumber,
    passwordHash,
    role: "customer",
    status: "active"
  });

  const isFinal = [
    APPLICATION_STATUSES.APPROVED,
    APPLICATION_STATUSES.REJECTED
  ].includes(scenario.status);

  const application = await KYCApplication.create({
    userId: customer._id,
    fullName: scenario.fullName,
    dateOfBirth: new Date("1992-05-15"),
    gender: "female",
    nationality: "Nigerian",
    residentialAddress: "15 Customer Status Demonstration Street, Lagos",
    phoneNumber: scenario.phoneNumber,
    occupation: "Business Analyst",
    applicationStatus: scenario.status,
    reviewedBy: isFinal ? administrator._id : undefined,
    reviewDate: isFinal ? new Date() : undefined,
    reviewComments: isFinal ? scenario.reviewComments : undefined
  });

  await createAssessment({ scenario, application, customer });

  console.log(`${scenario.fullName} created`);
  console.log(`Email: ${scenario.email}`);
  console.log(`Status: ${scenario.status}`);
}

try {
  await connectDB();

  const administrator = await User.findOne({
    email: "admin@example.com",
    role: "admin",
    status: "active"
  });

  if (!administrator) {
    throw new Error("Active Administrator admin@example.com was not found");
  }

  await removePreviousScenarios();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const scenario of SCENARIOS) {
    await createScenario({ scenario, administrator, passwordHash });
  }

  console.log("");
  console.log("Sprint 5 customer-status scenarios seeded successfully");
  console.log(`Shared password: ${PASSWORD}`);
} catch (error) {
  console.error("Customer-status seeding failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}