import bcrypt from "bcryptjs";

import User from "../models/Users.js";
import { generateToken } from "../utils/jwt.js";

export async function registerUser(userData) {
  const {
    fullName,
    email,
    phoneNumber,
    password
  } = userData;

  // Check if the email is existing 
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new Error("Email already exists");
  }

  // Check if the Phone is existing 
  const existingPhone = await User.findOne({ phoneNumber });
  if (existingPhone) {
    throw new Error("Phone number already exists");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    fullName,
    email,
    phoneNumber,
    passwordHash,
    role: "customer",
    status: "active"
  });

  // Generate Token
  const token = generateToken(user);

  return {
    user,
    token
  };
}




