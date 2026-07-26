import jwt from "jsonwebtoken";

import User from "../models/User.js";

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (
      !authHeader || !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Access Denied. Token required"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.userId
    ).select("-passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message:
          "Account is not active"
      });
    }

    req.user = user;

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired token"
    });
  }
}

export function authorizeRoles(
  ...allowedRoles
) {
  if (allowedRoles.length === 0) {
    throw new Error(
      "At least one authorized role is required"
    );
  }

  const allowedRoleSet =
    new Set(allowedRoles);

  return function authorizeRole(
    req,
    res,
    next
  ) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication is required"
      });
    }

    if (
      !allowedRoleSet.has(
        req.user.role
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access forbidden. Insufficient role permissions"
      });
    }

    next();
  };
}