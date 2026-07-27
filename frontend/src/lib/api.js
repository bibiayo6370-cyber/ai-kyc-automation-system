import axios from "axios";
import { getStoredToken } from "@/lib/authStorage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  config.headers = config.headers ?? {};

  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const shouldInvalidate = status === 401 ||
      (status === 403 && error.config?.logoutOnForbidden);

    if (shouldInvalidate && getStoredToken()) {
      window.dispatchEvent(new Event("auth:session-invalid"));
    }

    return Promise.reject(error);
  }
);

export default api;