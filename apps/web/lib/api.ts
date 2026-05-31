const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

interface ApiErrorBody {
  message: string | string[];
}

function parseError(body: ApiErrorBody): string {
  const msg = body.message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? "Request failed");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { headers: optHeaders, ...rest } = options;
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...optHeaders },
    ...rest,
  });
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
    throw new Error("Session expired. Please sign in again.");
  }
  const data = (await res.json()) as T | ApiErrorBody;
  if (!res.ok) throw new Error(parseError(data as ApiErrorBody));
  return data as T;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const res = await fetch("/api/auth/token");
  const { token } = (await res.json()) as { token: string | null };
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Unauthenticated client — use for login/register */
export const api = {
  get: <T>(path: string, headers?: HeadersInit): Promise<T> =>
    request<T>(path, { method: "GET", headers }),
  post: <T>(path: string, body: unknown, headers?: HeadersInit): Promise<T> =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), headers }),
  patch: <T>(path: string, body: unknown, headers?: HeadersInit): Promise<T> =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body), headers }),
  delete: <T>(path: string, headers?: HeadersInit): Promise<T> =>
    request<T>(path, { method: "DELETE", headers }),
};

/** Authenticated client — auto-injects Bearer token from httpOnly cookie */
export const authApi = {
  get: async <T>(path: string): Promise<T> =>
    request<T>(path, { method: "GET", headers: await getAuthHeader() }),
  post: async <T>(path: string, body: unknown): Promise<T> =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), headers: await getAuthHeader() }),
  patch: async <T>(path: string, body: unknown): Promise<T> =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body), headers: await getAuthHeader() }),
  delete: async <T>(path: string): Promise<T> =>
    request<T>(path, { method: "DELETE", headers: await getAuthHeader() }),
};
