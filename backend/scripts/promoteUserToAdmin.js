import mongoose from "mongoose";
import connectDB from "../src/config/database.js";
import User from "../src/models/User.js";

const email = process.argv[2]?.trim().toLowerCase();

async function promoteUserToAdmin() {
  if (!email) {
    throw new Error(
      "Provide the user email: npm run promote:admin -- admin@example.com"
    );
  }

  await connectDB();

  const user = await User.findOne({ email });

  if (!user) {
    throw new Error(`User was not found: ${email}`);
  }

  if (user.role === "admin") {
    console.log(`User is already an Administrator: ${user.email}`);
    return;
  }

  user.role = "admin";
  await user.save();

  console.log("Administrator role assigned successfully");
  console.log(`User: ${user.fullName}`);
  console.log(`Email: ${user.email}`);
  console.log(`Role: ${user.role}`);
}

try {
  await promoteUserToAdmin();
} catch (error) {
  console.error(`Administrator promotion failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}