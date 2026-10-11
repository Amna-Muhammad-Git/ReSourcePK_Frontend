export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token;
};

export async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({
    error: { message: "The server returned an unreadable response" },
  }));
  if (!response.ok) {
    const error = new Error(payload.error?.message || "Request failed");
    error.code = payload.error?.code;
    error.details = payload.error?.details;
    throw error;
  }
  return payload.data;
}

export async function downloadFile(path, filename) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!response.ok) throw new Error("Could not download the template");
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
