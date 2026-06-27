import axios from "axios";

// Prefer same-origin (no CORS, cookies always work).
// Fallback to env var only if explicitly different host is required.
const ENV_URL = process.env.REACT_APP_BACKEND_URL || "";
const SAME_ORIGIN = typeof window !== "undefined" ? window.location.origin : "";

// Use env URL only when it points to the SAME host as the page; otherwise same-origin.
let API_BASE = `${SAME_ORIGIN}/api`;
try {
  if (ENV_URL) {
    const envHost = new URL(ENV_URL).host;
    const curHost = typeof window !== "undefined" ? window.location.host : "";
    if (envHost === curHost) API_BASE = `${ENV_URL.replace(/\/$/, "")}/api`;
  }
} catch (_) {}

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e?.response?.data?.detail && typeof e.response.data.detail !== "string") {
      try {
        e.response.data.detail = Array.isArray(e.response.data.detail)
          ? e.response.data.detail.map((d) => d.msg || JSON.stringify(d)).join(", ")
          : JSON.stringify(e.response.data.detail);
      } catch (_) {}
    }
    return Promise.reject(e);
  }
);

export default api;
