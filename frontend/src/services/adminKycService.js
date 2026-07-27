import api from "@/lib/api";

export async function fetchAdministratorReviewQueue({ page = 1, limit = 20, riskLevel, signal } = {}) {
  const params = { page, limit };

  if (riskLevel) params.riskLevel = riskLevel;

  const { data } = await api.get("/admin/kyc/review-queue", { params, signal });
  return data;
}

export async function fetchAdministratorApplicationDetail({ applicationId, signal }) {
  const { data } = await api.get(
    `/admin/kyc/applications/${encodeURIComponent(applicationId)}`,
    { signal }
  );

  return data;
}