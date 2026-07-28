import mongoose from "mongoose";
import connectDB from "../src/config/database.js";
import AuditLog from "../src/models/AuditLog.js";
import KYCApplication from "../src/models/KYCApplication.js";
import RiskAssessment from "../src/models/RiskAssessment.js";
import User from "../src/models/User.js";

const EMAIL_PATTERN = /^sprint5-status-[a-z]+@example\.com$/i;

async function cleanupCustomerStatusScenarios() {
  await connectDB();

  const users = await User.find({ email: EMAIL_PATTERN }).select("_id").lean();
  const userIds = users.map((user) => user._id);

  if (userIds.length === 0) {
    console.log("No customer-status demonstration records were found");
    return;
  }

  const applications = await KYCApplication.find({
    userId: { $in: userIds }
  }).select("_id").lean();

  const applicationIds = applications.map((application) => application._id);

  if (applicationIds.length > 0) {
    await AuditLog.collection.deleteMany({
      applicationId: { $in: applicationIds }
    });

    await RiskAssessment.deleteMany({
      applicationId: { $in: applicationIds }
    });

    await KYCApplication.deleteMany({
      _id: { $in: applicationIds }
    });
  }

  await User.deleteMany({ _id: { $in: userIds } });

  console.log(`Customer-status users removed: ${userIds.length}`);
  console.log(`Customer-status applications removed: ${applicationIds.length}`);
  console.log("Customer-status demonstration cleanup completed");
}

try {
  await cleanupCustomerStatusScenarios();
} catch (error) {
  console.error("Customer-status cleanup failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}