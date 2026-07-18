import {
  createKYCApplication,
  getMyKYCApplication,
  getKYCApplicationById
} from "../services/kycService.js";

export async function createApplication(
  req,
  res
) {
  try {
    const userId = req.user?._id;

    const application =
      await createKYCApplication(
        userId,
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        "KYC application submitted successfully",
      application
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const validationErrors =
        Object.values(error.errors).map(
          validationError =>
            validationError.message
        );

      return res.status(400).json({
        success: false,
        message: "Application validation failed",
        errors: validationErrors
      });
    }

    const statusCode =
      error.statusCode ?? 500;

    if (statusCode === 500) {
      console.error(
        "KYC application creation failed:",
        error
      );
    }

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? "Unable to submit KYC application"
          : error.message
    });
  }
}

export async function getMyApplication(
  req,
  res
) {
  try {
    const userId = req.user?._id;

    const application =
      await getMyKYCApplication(
        userId
      );

    return res.status(200).json({
      success: true,
      message:
        "KYC application retrieved successfully",
      application
    });
  } catch (error) {
    const statusCode =
      error.statusCode ?? 500;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? "Unable to retrieve KYC application"
          : error.message
    });
  }
}

export async function getApplicationById(
  req,
  res
) {
  try {
    const userId = req.user?._id;
    const { id: applicationId } =
      req.params;

    const application =
      await getKYCApplicationById(
        applicationId,
        userId
      );

    return res.status(200).json({
      success: true,
      message: "KYC application details retrieved successfully",
      application
    });
  } catch (error) {
    const statusCode =
      error.statusCode ?? 500;

    if (statusCode === 500) {
      console.error(
        "KYC application details retrieval failed:",
        error
      );
    }

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? "Unable to retrieve KYC application details"
          : error.message
    });
  }
}