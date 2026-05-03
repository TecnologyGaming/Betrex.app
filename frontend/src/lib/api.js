import axios from "axios";

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
