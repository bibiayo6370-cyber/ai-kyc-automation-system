import api from "@/lib/api";

export async function createCustomerKycApplication(payload) {
  const { data } = await api.post("/applications", payload);
  return data;
}

export async function fetchMyKycApplication({ signal } = {}) {
  const { data } = await api.get("/applications", { signal });
  return data;
}

export async function fetchCustomerApplicationStatus({ applicationId, signal }) {
  const { data } = await api.get(
    `/applications/${encodeURIComponent(applicationId)}/status`,
    { signal }
  );

  return data;
}

