const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const DEFAULT_TIMEOUT_MS = 8000;

export class HttpError extends Error {
  constructor(status, statusText) {
    super(`HTTP ${status} ${statusText}`);
    this.name = "HttpError";
    this.status = status;
    this.statusText = statusText;
  }
}

export class NetworkError extends Error {
  constructor(cause) {
    super("No se pudo conectar con el servidor");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

async function request(path, { timeout = DEFAULT_TIMEOUT_MS, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    throw new NetworkError(error instanceof Error ? error : new Error("Fetch falló"));
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new HttpError(response.status, response.statusText);
  }

  const text = await response.text();
  if (text === "") {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new NetworkError(new Error("El servidor devolvió una respuesta inválida"));
  }
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  health: () => request("/health/"),
};

export default api;