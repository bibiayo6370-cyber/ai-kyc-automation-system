import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Clock3, Gavel, ShieldX } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import ApplicationStatusBadge from "@/components/admin/ApplicationStatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitAdministratorDecision } from "@/services/adminKycService";

const ADMIN_ACTIONS = [
  "approve",
  "reject",
  "retain_under_review"
];

const DECISION_CONFIG = {
  approve: {
    label: "Approve application",
    shortLabel: "Approve",
    description:
      "The application will be approved and the decision will become final.",
    icon: CheckCircle2,
    buttonClass:
      "bg-emerald-600 text-white hover:bg-emerald-500"
  },
  reject: {
    label: "Reject application",
    shortLabel: "Reject",
    description:
      "The application will be rejected and the decision will become final.",
    icon: ShieldX,
    buttonClass:
      "bg-red-600 text-white hover:bg-red-500"
  },
  retain_under_review: {
    label: "Retain under review",
    shortLabel: "Retain under review",
    description:
      "The application will remain under review for further investigation.",
    icon: Clock3,
    buttonClass:
      "bg-amber-600 text-white hover:bg-amber-500"
  }
};

const decisionSchema = z
  .object({
    action: z
      .string()
      .refine(
        (value) => ADMIN_ACTIONS.includes(value),
        "Select an Administrator decision"
      ),
    reviewComments: z
      .string()
      .trim()
      .max(1000, "Review comments cannot exceed 1000 characters")
  })
  .superRefine((values, context) => {
    const commentsRequired =
      values.action === "reject" ||
      values.action === "retain_under_review";

    if (commentsRequired && values.reviewComments.length < 10) {
      context.addIssue({
        code: "custom",
        path: ["reviewComments"],
        message:
          "Enter at least 10 characters explaining this decision"
      });
    }
  });

export default function AdministratorDecisionPanel({
  applicationId,
  applicationStatus,
  onDecisionRecorded
}) {
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    control,
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(decisionSchema),
    defaultValues: {
      action: "",
      reviewComments: ""
    }
  });

  const selectedAction = useWatch({
    control,
    name: "action",
    defaultValue: ""
  });
  const reviewComments = useWatch({
    control,
    name: "reviewComments",
    defaultValue: ""
  });
  const decisionConfig = DECISION_CONFIG[selectedAction];

  async function prepareDecision(action) {
    setServerError("");
    setSuccessMessage("");
    setValue("action", action, {
      shouldDirty: true,
      shouldValidate: true
    });

    const isValid = await trigger();

    if (isValid) setIsConfirmationOpen(true);
  }

  async function submitDecision(values) {
    setServerError("");

    try {
      await submitAdministratorDecision({
        applicationId,
        action: values.action,
        reviewComments: values.reviewComments
      });

      setSuccessMessage(
        `${DECISION_CONFIG[values.action].label} recorded successfully.`
      );
      setIsConfirmationOpen(false);
      onDecisionRecorded();
    } catch (error) {
      setServerError(
        error.response?.data?.message ??
        "The Administrator decision could not be recorded."
      );
      setIsConfirmationOpen(false);
    }
  }

  if (applicationStatus !== "under_review") {
    return (
      <Card className="border-slate-800 bg-slate-900 text-slate-100">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Gavel className="size-5 text-emerald-400" />
            <CardTitle>Administrator decision</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium text-slate-100">
              A final decision has already been recorded.
            </p>
            <p className="mt-1 text-sm text-slate-400">
              This application cannot receive another Administrator decision.
            </p>
          </div>

          <ApplicationStatusBadge status={applicationStatus} />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-slate-800 bg-slate-900 text-slate-100">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Gavel className="size-5 text-emerald-400" />
            <CardTitle>Administrator decision</CardTitle>
          </div>

          <CardDescription className="text-slate-400">
            Review the automated findings and record the appropriate KYC
            decision.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(event) => event.preventDefault()}
          >
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            <input type="hidden" {...register("action")} />

            <div className="space-y-2">
              <Label htmlFor="review-comments">
                Review comments
              </Label>

              <Textarea
                id="review-comments"
                rows={5}
                maxLength={1000}
                placeholder="Explain the decision or record any additional review observations."
                className="border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-600"
                aria-invalid={Boolean(errors.reviewComments)}
                {...register("reviewComments")}
              />

              <div className="flex items-start justify-between gap-4">
                <div>
                  {errors.reviewComments && (
                    <p className="text-sm text-red-400">
                      {errors.reviewComments.message}
                    </p>
                  )}

                  {errors.action && (
                    <p className="text-sm text-red-400">
                      {errors.action.message}
                    </p>
                  )}
                </div>

                <p className="shrink-0 text-xs text-slate-500">
                  {reviewComments.length}/1000
                </p>
              </div>

              <p className="text-xs text-slate-500">
                Comments are optional for approval and required for rejection
                or retaining an application under review.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(DECISION_CONFIG).map(
                ([action, config]) => {
                  const Icon = config.icon;

                  return (
                    <Button
                      key={action}
                      type="button"
                      className={config.buttonClass}
                      disabled={isSubmitting}
                      onClick={() => prepareDecision(action)}
                    >
                      <Icon className="size-4" />
                      {config.shortLabel}
                    </Button>
                  );
                }
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertDialog
        open={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
      >
        <AlertDialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm Administrator decision
            </AlertDialogTitle>

            <AlertDialogDescription className="text-slate-400">
              {decisionConfig?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Selected action
            </p>

            <p className="mt-2 font-medium text-slate-100">
              {decisionConfig?.label}
            </p>

            {reviewComments.trim() && (
              <>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Review comments
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {reviewComments.trim()}
                </p>
              </>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isSubmitting}
              className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={isSubmitting}
              className={decisionConfig?.buttonClass}
              onClick={() => handleSubmit(submitDecision)()}
            >
              {isSubmitting
                ? "Recording decision..."
                : `Confirm ${decisionConfig?.shortLabel ?? "decision"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}