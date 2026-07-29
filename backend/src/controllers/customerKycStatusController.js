import { getCustomerApplicationStatus } from "../services/customerKycStatusService.js";

export async function getApplicationStatus(req, res) {
  try {
    const status = await getCustomerApplicationStatus({
      applicationId: req.params.applicationId,
      userId: req.user?._id
    });

    return res.status(200).json({
      success: true,
      message: "KYC application status retrieved successfully",
      status
    });
  } catch (error) {
    const statusCode = error.statusCode ?? 500;

    if (statusCode === 500) {
      console.error("Customer KYC status retrieval failed:", error);
    }

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? "Unable to retrieve KYC application status"
          : error.message
    });
  }
}