import { APPLICATION_STATUSES } from "../config/kycReviewConstants.js";
import KYCApplication from "../models/KYCApplication.js";
import { recordApplicationMovedToReview } from "./auditLogService.js";

export async function moveApplicationToReviewAfterAssessment({
  applicationId,
  customerId,
  riskAssessmentId
}) {
  const transitionResult =
    await KYCApplication.updateOne(
      {
        _id: applicationId,
        applicationStatus: APPLICATION_STATUSES.PENDING
      },
      {
        $set: {
          applicationStatus: APPLICATION_STATUSES.UNDER_REVIEW
        }
      }
    );

  if (
    transitionResult.modifiedCount === 0
  ) { return false; }

  try {
    await recordApplicationMovedToReview({
      applicationId,
      customerId,
      riskAssessmentId
    });
  } catch (error) {
    await KYCApplication.updateOne(
      {
        _id: applicationId,
        applicationStatus: APPLICATION_STATUSES.UNDER_REVIEW,

        reviewedBy:
          null,

        reviewDate:
          null,

        reviewComments:
          null
      },
      {
        $set: {
          applicationStatus:
            APPLICATION_STATUSES.PENDING
        }
      }
    );

    throw error;
  }

  return true;
}