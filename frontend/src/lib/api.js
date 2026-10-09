import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, withCredentials: true });

const NO_REFRESH = ["/auth/refresh", "/auth/login", "/auth/register", "/auth/google/session"];
let refreshing = null;

const refreshSession = () => {
  refreshing = refreshing || api.post("/auth/refresh").finally(() => { refreshing = null; });
  return refreshing;
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !NO_REFRESH.some((p) => original.url.includes(p))) {
      original._retry = true;
      try {
        await refreshSession();
        return api(original);
      } catch {
        throw error;
      }
    }
    throw error;
  }
);

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const errorMessage = (e) => formatApiErrorDetail(e?.response?.data?.detail) || e?.message;

export async function streamGuide(analysisId, body, onEvent, retry = true) {
  const res = await fetch(`${API}/analyses/${analysisId}/guide/messages`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 401 && retry) {
    await refreshSession();
    return streamGuide(analysisId, body, onEvent, false);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(formatApiErrorDetail(data.detail));
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop();
    parts.forEach((part) => {
      const line = part.trim();
      if (line.startsWith("data: ")) onEvent(JSON.parse(line.slice(6)));
    });
  }
}
