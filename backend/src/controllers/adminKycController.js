import { getAdministratorApplicationDetail, getAdministratorReviewQueue } from "../services/adminKycService.js";
import { reviewKycApplication } from "../services/adminKycDecisionService.js";

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

export async function getApplicationDetail(
  req,
  res
) {
  try {
    const result =
      await getAdministratorApplicationDetail({
        applicationId:
          req.params.applicationId
      });

    return res.status(200).json({
      success: true,

      message:
        "Administrator KYC application details retrieved successfully",

      ...result
    });
  } catch (error) {
    const statusCode =
      error.statusCode ??
      500;

    if (statusCode === 500) {
      console.error(
        "Administrator KYC application details retrieval failed:",
        error
      );
    }

    return res.status(
      statusCode
    ).json({
      success: false,

      message:
        statusCode === 500
          ? "Unable to retrieve administrator KYC application details"
          : error.message
    });
  }
}

export async function reviewApplication(req, res) {
  try {
    const result = await reviewKycApplication({
      applicationId: req.params.applicationId,
      administratorId: req.user?._id,
      action: req.body?.action,
      reviewComments: req.body?.reviewComments
    });

    const { application, assessment, auditLog } = result;

    return res.status(200).json({
      success: true,
      message: "Administrator KYC decision recorded successfully",
      decision: {
        applicationId: application._id,
        applicationStatus: application.applicationStatus,
        reviewedBy: application.reviewedBy,
        reviewDate: application.reviewDate,
        reviewComments: application.reviewComments,
        riskAssessment: {
          id: assessment._id,
          riskScore: assessment.riskScore,
          riskLevel: assessment.riskLevel,
          recommendation: assessment.recommendation,
          reviewRequired: assessment.reviewRequired
        },
        auditLog: {
          id: auditLog._id,
          action: auditLog.action,
          previousStatus: auditLog.previousStatus,
          newStatus: auditLog.newStatus,
          createdAt: auditLog.createdAt
        }
      }
    });
  } catch (error) {
    const statusCode = error.statusCode ?? 500;

    if (statusCode === 500) {
      console.error("Administrator KYC decision failed:", error);
    }

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? "Unable to record administrator KYC decision"
          : error.message
    });
  }
}