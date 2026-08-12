import axios from "axios";
import { getErrorMessage, logError } from "../utils/errors";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://aqro-server.vercel.app/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    let token = null;
    try {
      token = localStorage.getItem("aqro_token");
    } catch (e) {
      logError("localStorage-dan token oxunmadi", e);
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    logError("axios request interceptor", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const method = error.config?.method?.toUpperCase() || "REQUEST";
    const url = error.config?.url || "";
    error.userMessage = getErrorMessage(error);
    logError(`${method} ${url} ugursuz oldu`, error);
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL };
