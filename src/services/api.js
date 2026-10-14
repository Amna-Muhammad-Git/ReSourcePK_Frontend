export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000/api/v1" : "");
let accessToken = null;
let refreshPromise = null;
export const setAccessToken = (token) => {
  accessToken = token;
};

async function request(path, options = {}) {
  if (!API_BASE_URL)
    throw new Error("The service is unavailable. Please try again later.");
  const { responseType, ...requestOptions } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    credentials: "include",
    headers: {
      "X-ReSourcePK-CSRF": "1",
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  if (response.ok && responseType === "blob") return response.blob();
  const payload = await response.json().catch(() => ({
    error: { message: "The server returned an unreadable response" },
  }));
  if (!response.ok) {
    const error = new Error(payload.error?.message || "Request failed");
    error.code = payload.error?.code;
    error.status = response.status;
    error.details = payload.error?.details;
    throw error;
  }
  return payload.data;
}

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = request("/auth/refresh", { method: "POST" })
      .then((data) => {
        setAccessToken(data.accessToken);
        window.dispatchEvent(
          new CustomEvent("resourcepk-session-context", {
            detail: data.context,
          }),
        );
        return data;
      })
      .catch((error) => {
        setAccessToken(null);
        window.dispatchEvent(
          new CustomEvent("resourcepk-session-context", { detail: null }),
        );
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function api(path, options = {}) {
  try {
    return await request(path, options);
  } catch (error) {
    if (error.status !== 401 || path.startsWith("/auth/") || !accessToken)
      throw error;
    await refreshSession();
    return request(path, options);
  }
}

export async function downloadFile(path, filename) {
  const objectUrl = URL.createObjectURL(
    await api(path, { responseType: "blob" }),
  );
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
