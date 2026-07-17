import {
  createKYCApplication
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