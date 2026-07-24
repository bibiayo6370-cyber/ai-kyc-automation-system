import {
  getApplicationRiskAssessment
} from
  "../services/riskAssessmentService.js";

function sendRiskAssessmentError(
  res,
  error,
  operation
) {
  const statusCode =
    error?.statusCode ?? 500;

  if (statusCode === 500) {
    console.error(
      `${operation} failed:`,
      error
    );
  }

  return res
    .status(statusCode)
    .json({
      success: false,

      message:
        statusCode === 500
          ? `Unable to ${operation}`
          : error.message
    });
}

function createCustomerRiskSummary(
  assessment
) {
  return {
    assessmentStatus:
      assessment.assessmentStatus,

    riskScore:
      assessment.riskScore ??
      null,

    riskLevel:
      assessment.riskLevel ??
      null,

    recommendation:
      assessment.recommendation ??
      null,

    reviewRequired:
      assessment.reviewRequired ??
      null,

    assessmentReasons:
      assessment.assessmentReasons ??
      [],

    assessedAt:
      assessment.assessedAt ??
      null
  };
}

export async function getRiskAssessment(
  req,
  res
) {
  try {
    const assessment =
      await getApplicationRiskAssessment({
        applicationId:
          req.params.applicationId,

        userId:
          req.user?._id
      });

    return res
      .status(200)
      .json({
        success: true,

        message:
          "KYC risk assessment retrieved successfully",

        riskAssessment:
          createCustomerRiskSummary(
            assessment
          )
      });
  } catch (error) {
    return sendRiskAssessmentError(
      res,
      error,
      "retrieve KYC risk assessment"
    );
  }
}