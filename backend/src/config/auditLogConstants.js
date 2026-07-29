import {
  APPLICATION_STATUSES,
  ADMIN_REVIEW_ACTIONS
} from "./kycReviewConstants.js";

export const AUDIT_ACTOR_ROLES =
  Object.freeze({
    SYSTEM: "system",
    ADMIN: "admin"
  });

export const AUDIT_ACTOR_ROLE_VALUES =
  Object.freeze(
    Object.values(
      AUDIT_ACTOR_ROLES
    )
  );

export const AUDIT_ACTIONS =
  Object.freeze({
    APPLICATION_MOVED_TO_REVIEW:
      "application_moved_to_review",

    APPLICATION_APPROVED:
      "application_approved",

    APPLICATION_REJECTED:
      "application_rejected",

    APPLICATION_RETAINED_UNDER_REVIEW:
      "application_retained_under_review"
  });

export const AUDIT_ACTION_VALUES =
  Object.freeze(
    Object.values(
      AUDIT_ACTIONS
    )
  );

export const AUDIT_ACTION_POLICIES =
  Object.freeze({
    [AUDIT_ACTIONS
      .APPLICATION_MOVED_TO_REVIEW]:
      Object.freeze({
        actorRole:
          AUDIT_ACTOR_ROLES.SYSTEM,

        previousStatus:
          APPLICATION_STATUSES.PENDING,

        newStatus:
          APPLICATION_STATUSES
            .UNDER_REVIEW,

        commentsRequired:
          false
      }),

    [AUDIT_ACTIONS
      .APPLICATION_APPROVED]:
      Object.freeze({
        actorRole:
          AUDIT_ACTOR_ROLES.ADMIN,

        previousStatus:
          APPLICATION_STATUSES
            .UNDER_REVIEW,

        newStatus:
          APPLICATION_STATUSES.APPROVED,

        commentsRequired:
          false
      }),

    [AUDIT_ACTIONS
      .APPLICATION_REJECTED]:
      Object.freeze({
        actorRole:
          AUDIT_ACTOR_ROLES.ADMIN,

        previousStatus:
          APPLICATION_STATUSES
            .UNDER_REVIEW,

        newStatus:
          APPLICATION_STATUSES.REJECTED,

        commentsRequired:
          true
      }),

    [AUDIT_ACTIONS
      .APPLICATION_RETAINED_UNDER_REVIEW]:
      Object.freeze({
        actorRole:
          AUDIT_ACTOR_ROLES.ADMIN,

        previousStatus:
          APPLICATION_STATUSES
            .UNDER_REVIEW,

        newStatus:
          APPLICATION_STATUSES
            .UNDER_REVIEW,

        commentsRequired:
          true
      })
  });

export const ADMIN_REVIEW_ACTION_TO_AUDIT_ACTION =
  Object.freeze({
    [ADMIN_REVIEW_ACTIONS.APPROVE]:
      AUDIT_ACTIONS
        .APPLICATION_APPROVED,

    [ADMIN_REVIEW_ACTIONS.REJECT]:
      AUDIT_ACTIONS
        .APPLICATION_REJECTED,

    [ADMIN_REVIEW_ACTIONS
      .RETAIN_UNDER_REVIEW]:
      AUDIT_ACTIONS
        .APPLICATION_RETAINED_UNDER_REVIEW
  });

export function getAuditActionPolicy(
  action
) {
  const policy =
    AUDIT_ACTION_POLICIES[action];

  if (!policy) {
    throw new Error(
      "Unsupported audit action"
    );
  }

  return policy;
}

export function getAuditActionForAdminReview(
  action
) {
  const auditAction =
    ADMIN_REVIEW_ACTION_TO_AUDIT_ACTION[
    action
    ];

  if (!auditAction) {
    throw new Error(
      "Unsupported administrator review action"
    );
  }

  return auditAction;
}