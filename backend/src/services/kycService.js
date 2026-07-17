import KYCApplication from "../models/KYCApplication.js";

function createServiceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
}

export async function createKYCApplication(
  userId,
  applicationData
) {
  if (!userId) {
    throw createServiceError(
      "Authenticated user is required",
      401
    );
  }

  const existingApplication =
    await KYCApplication.exists({
      userId
    });

  if (existingApplication) {
    throw createServiceError(
      "A KYC application already exists for this user",
      409
    );
  }

  const {
    fullName,
    dateOfBirth,
    gender,
    nationality,
    residentialAddress,
    phoneNumber,
    occupation
  } = applicationData;

  try {
    const application =
      await KYCApplication.create({
        userId,
        fullName,
        dateOfBirth,
        gender,
        nationality,
        residentialAddress,
        phoneNumber,
        occupation,
        applicationStatus: "pending"
      });

    return application;
  } catch (error) {
    // Protect against simultaneous duplicate submissions.
    if (
      error.code === 11000 &&
      error.keyPattern?.userId
    ) {
      throw createServiceError(
        "A KYC application already exists for this user",
        409
      );
    }

    throw error;
  }
}