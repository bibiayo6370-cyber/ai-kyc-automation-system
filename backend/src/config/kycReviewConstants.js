export const APPLICATION_STATUSES =
  Object.freeze({
    PENDING: "pending",
    UNDER_REVIEW: "under_review",
    APPROVED: "approved",
    REJECTED: "rejected"
  });

export const APPLICATION_STATUS_VALUES =
  Object.freeze(
    Object.values(
      APPLICATION_STATUSES
    )
  );

export const ADMIN_REVIEW_ACTIONS =
  Object.freeze({
    APPROVE: "approve",
    REJECT: "reject",
    RETAIN_UNDER_REVIEW:
      "retain_under_review"
  });

export const ADMIN_REVIEW_ACTION_VALUES =
  Object.freeze(
    Object.values(
      ADMIN_REVIEW_ACTIONS
    )
  );

export const REVIEW_ACTION_TO_STATUS =
  Object.freeze({
    [ADMIN_REVIEW_ACTIONS.APPROVE]:
      APPLICATION_STATUSES.APPROVED,

    [ADMIN_REVIEW_ACTIONS.REJECT]:
      APPLICATION_STATUSES.REJECTED,

    [ADMIN_REVIEW_ACTIONS
      .RETAIN_UNDER_REVIEW]:
      APPLICATION_STATUSES
        .UNDER_REVIEW
  });

export const FINAL_APPLICATION_STATUSES =
  Object.freeze([
    APPLICATION_STATUSES.APPROVED,
    APPLICATION_STATUSES.REJECTED
  ]);

export const REVIEWABLE_APPLICATION_STATUSES =
  Object.freeze([
    APPLICATION_STATUSES
      .UNDER_REVIEW
  ]);

export const REVIEW_ACTIONS_REQUIRING_COMMENTS =
  Object.freeze([
    ADMIN_REVIEW_ACTIONS.REJECT,
    ADMIN_REVIEW_ACTIONS
      .RETAIN_UNDER_REVIEW
  ]);

export const REVIEW_COMMENT_RULES =
  Object.freeze({
    MIN_REQUIRED_LENGTH: 10,
    MAX_LENGTH: 1000
  });

export function getStatusForReviewAction(
  action
) {
  const applicationStatus =
    REVIEW_ACTION_TO_STATUS[action];

  if (!applicationStatus) {
    throw new Error(
      "Unsupported administrator review action"
    );
  }

  return applicationStatus;
}

export function isFinalApplicationStatus(
  applicationStatus
) {
  return FINAL_APPLICATION_STATUSES
    .includes(
      applicationStatus
    );
}

export function isReviewableApplicationStatus(
  applicationStatus
) {
  return REVIEWABLE_APPLICATION_STATUSES
    .includes(
      applicationStatus
    );
}

export function reviewActionRequiresComments(
  action
) {
  return REVIEW_ACTIONS_REQUIRING_COMMENTS
    .includes(
      action
    );
}