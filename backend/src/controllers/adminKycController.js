import { getAdministratorReviewQueue } from "../services/adminKycService.js";

export async function getReviewQueue(
  req,
  res
) {
  try {
    const result =
      await getAdministratorReviewQueue({
        page: req.query.page,
        limit: req.query.limit,
        riskLevel: req.query.riskLevel
      });

    return res.status(200).json({
      success: true,
      message: "Administrator review queue retrieved successfully",

      ...result
    });
  } catch (error) {
    const statusCode =
      error.statusCode ??
      500;

    if (statusCode === 500) {
      console.error(
        "Administrator review queue retrieval failed:",
        error
      );
    }

    return res.status(
      statusCode
    ).json({
      success: false,

      message:
        statusCode === 500
          ? "Unable to retrieve administrator review queue"
          : error.message
    });
  }
}