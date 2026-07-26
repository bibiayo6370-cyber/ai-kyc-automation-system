import assert from "node:assert/strict";
import { once } from "node:events";
import {
  randomInt,
  randomUUID
} from "node:crypto";

import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDB from
  "../src/config/database.js";

import User from
  "../src/models/User.js";

import {
  authenticate,
  authorizeRoles
} from
  "../src/middleware/authMiddleware.js";

const createdUserIds = [];

let server;

function createUniqueUserData({
  label,
  role,
  status
}) {
  const suffix =
    randomUUID()
      .replaceAll("-", "")
      .slice(0, 12);

  const phoneSuffix =
    randomInt(
      10000000,
      99999999
    );

  return {
    fullName:
      `${label} Authorization User`,

    email:
      `${label}-${suffix}@example.com`,

    phoneNumber:
      `+23480${phoneSuffix}`,

    passwordHash:
      "verification-password-hash",

    role,
    status
  };
}

async function createTestUser(
  userData
) {
  const user =
    await User.create(
      userData
    );

  createdUserIds.push(
    user._id
  );

  return user;
}

function createToken(
  user
) {
  return jwt.sign(
    {
      userId:
        String(user._id)
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "5m"
    }
  );
}

async function requestJson({
  baseUrl,
  path,
  token
}) {
  const headers = {};

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response =
    await fetch(
      `${baseUrl}${path}`,
      {
        headers
      }
    );

  const body =
    await response.json();

  return {
    status:
      response.status,

    body
  };
}

try {
  await connectDB();

  assert.throws(
    () =>
      authorizeRoles(),
    {
      message:
        "At least one authorized role is required"
    }
  );

  console.log(
    "Role-middleware configuration validation verified"
  );

  const activeCustomer =
    await createTestUser(
      createUniqueUserData({
        label: "customer",
        role: "customer",
        status: "active"
      })
    );

  const activeAdmin =
    await createTestUser(
      createUniqueUserData({
        label: "admin",
        role: "admin",
        status: "active"
      })
    );

  const inactiveAdmin =
    await createTestUser(
      createUniqueUserData({
        label: "inactive-admin",
        role: "admin",
        status: "inactive"
      })
    );

  const suspendedAdmin =
    await createTestUser(
      createUniqueUserData({
        label: "suspended-admin",
        role: "admin",
        status: "suspended"
      })
    );

  const app =
    express();

  app.get(
    "/protected",
    authenticate,
    (req, res) => {
      return res.status(200).json({
        success: true,
        user: {
          id:
            req.user._id,
          role:
            req.user.role,
          status:
            req.user.status
        }
      });
    }
  );

  app.get(
    "/admin",
    authenticate,
    authorizeRoles("admin"),
    (req, res) => {
      return res.status(200).json({
        success: true,
        message:
          "Administrator access granted",
        administratorId:
          req.user._id
      });
    }
  );

  app.get(
    "/role-only",
    authorizeRoles("admin"),
    (req, res) => {
      return res.status(200).json({
        success: true
      });
    }
  );

  server =
    app.listen(
      0,
      "127.0.0.1"
    );

  await once(
    server,
    "listening"
  );

  const address =
    server.address();

  assert.equal(
    typeof address,
    "object"
  );

  const baseUrl =
    `http://127.0.0.1:${address.port}`;

  const noTokenResult =
    await requestJson({
      baseUrl,
      path: "/admin"
    });

  assert.equal(
    noTokenResult.status,
    401
  );

  assert.equal(
    noTokenResult.body.message,
    "Access Denied. Token required"
  );

  const invalidTokenResult =
    await requestJson({
      baseUrl,
      path: "/admin",
      token: "invalid-token"
    });

  assert.equal(
    invalidTokenResult.status,
    401
  );

  assert.equal(
    invalidTokenResult.body.message,
    "Invalid or expired token"
  );

  console.log(
    "Missing and invalid token rejection verified"
  );

  const customerToken =
    createToken(
      activeCustomer
    );

  const customerProtectedResult =
    await requestJson({
      baseUrl,
      path: "/protected",
      token:
        customerToken
    });

  assert.equal(
    customerProtectedResult.status,
    200
  );

  assert.equal(
    customerProtectedResult
      .body
      .user
      .role,
    "customer"
  );

  const customerAdminResult =
    await requestJson({
      baseUrl,
      path: "/admin",
      token:
        customerToken
    });

  assert.equal(
    customerAdminResult.status,
    403
  );

  assert.equal(
    customerAdminResult
      .body
      .message,
    "Access forbidden. Insufficient role permissions"
  );

  console.log(
    "Customer access to administrator route denied"
  );

  const adminToken =
    createToken(
      activeAdmin
    );

  const adminResult =
    await requestJson({
      baseUrl,
      path: "/admin",
      token:
        adminToken
    });

  assert.equal(
    adminResult.status,
    200
  );

  assert.equal(
    adminResult.body.message,
    "Administrator access granted"
  );

  assert.equal(
    String(
      adminResult.body.administratorId
    ),
    String(
      activeAdmin._id
    )
  );

  console.log(
    "Active administrator authorization verified"
  );

  for (
    const blockedUser of
    [
      inactiveAdmin,
      suspendedAdmin
    ]
  ) {
    const blockedResult =
      await requestJson({
        baseUrl,
        path: "/protected",
        token:
          createToken(
            blockedUser
          )
      });

    assert.equal(
      blockedResult.status,
      403
    );

    assert.equal(
      blockedResult.body.message,
      "Account is not active"
    );
  }

  console.log(
    "Inactive and suspended account access denied"
  );

  const roleOnlyResult =
    await requestJson({
      baseUrl,
      path: "/role-only"
    });

  assert.equal(
    roleOnlyResult.status,
    401
  );

  assert.equal(
    roleOnlyResult.body.message,
    "Authentication is required"
  );

  console.log(
    "Role middleware authentication dependency verified"
  );

  console.log(
    "Sprint 5 administrator authorization middleware verification passed"
  );
} catch (error) {
  console.error(
    "Sprint 5 administrator authorization middleware verification failed:",
    error
  );

  process.exitCode = 1;
} finally {
  if (server) {
    await new Promise(
      (resolve, reject) => {
        server.close(
          error => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          }
        );
      }
    ).catch(
      () => undefined
    );
  }

  if (
    createdUserIds.length > 0
  ) {
    await User.deleteMany({
      _id: {
        $in:
          createdUserIds
      }
    }).catch(
      () => undefined
    );
  }

  console.log(
    "Temporary authorization verification users removed"
  );

  await mongoose.disconnect();
}