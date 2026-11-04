/**
 * Klien HTTP dasar untuk API Sagara Denim.
 *
 * Secara bawaan request memakai path relatif `/api` sehingga melewati rewrite
 * Next.js dan cookie autentikasi tetap same-origin. Access token yang
 * kedaluwarsa diperbarui sekali secara transparan, lalu request diulang.
 */

export interface MessageResponse {
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, message: string, detail: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Lewati refresh otomatis, misalnya untuk login dan bootstrap sesi. */
  skipAuthRefresh?: boolean;
}

export type AuthBroadcastMessage =
  | { type: "signed-in" }
  | { type: "signed-out" }
  | { type: "session-expired" };

export const AUTH_BROADCAST_CHANNEL = "sagara-auth";
export const SESSION_EXPIRED_EVENT = "sagara:session-expired";

type RefreshResult = "ok" | "expired" | "unavailable";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const REFRESH_LOCK_NAME = "sagara-auth-refresh";

let refreshPromise: Promise<RefreshResult> | null = null;

function buildUrl(
  path: string,
  query?: Record<string, QueryValue>,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const searchParams = new URLSearchParams();

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
  }

  const search = searchParams.toString();
  return `${API_BASE_URL}${normalizedPath}${search ? `?${search}` : ""}`;
}

export function broadcastAuth(message: AuthBroadcastMessage): void {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return;
  }

  const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
  channel.postMessage(message);
  channel.close();
}

function notifySessionExpired(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  broadcastAuth({ type: "session-expired" });
}

function extractMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      for (const item of detail) {
        if (
          item &&
          typeof item === "object" &&
          typeof (item as { msg?: unknown }).msg === "string"
        ) {
          return (item as { msg: string }).msg;
        }
      }
    }
  }

  return fallback;
}

async function readPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

function buildRequestInit(options: ApiRequestOptions): RequestInit {
  const { body, headers, ...init } = options;
  delete init.query;
  delete init.skipAuthRefresh;

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  if (body !== undefined && !isFormData && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  return {
    cache: "no-store",
    credentials: "include",
    ...init,
    headers: requestHeaders,
    body:
      body === undefined || body === null
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
  };
}

async function sendRequest(
  path: string,
  options: ApiRequestOptions,
): Promise<Response> {
  return fetch(buildUrl(path, options.query), buildRequestInit(options));
}

async function performRefresh(): Promise<RefreshResult> {
  try {
    const response = await fetch(buildUrl("/api/auth/refresh"), {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      return "ok";
    }

    return response.status === 401 || response.status === 403
      ? "expired"
      : "unavailable";
  } catch {
    return "unavailable";
  }
}

async function requestNewAccessToken(): Promise<RefreshResult> {
  if (!refreshPromise) {
    const run = async (): Promise<RefreshResult> => {
      if (typeof navigator !== "undefined" && "locks" in navigator) {
        try {
          return await navigator.locks.request(
            REFRESH_LOCK_NAME,
            performRefresh,
          );
        } catch {
          return performRefresh();
        }
      }

      return performRefresh();
    };

    refreshPromise = run().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await readPayload(response);
    throw new ApiError(
      response.status,
      extractMessage(payload, "Permintaan ke server gagal."),
      payload,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return (await response.text()) as T;
  }

  return (await response.json()) as T;
}

async function requestWithRefresh(
  path: string,
  options: ApiRequestOptions,
): Promise<Response> {
  const response = await sendRequest(path, options);

  if (response.status !== 401 || options.skipAuthRefresh) {
    return response;
  }

  const refreshResult = await requestNewAccessToken();

  if (refreshResult === "unavailable") {
    throw new ApiError(
      503,
      "Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.",
    );
  }

  if (refreshResult === "expired") {
    notifySessionExpired();
    throw new ApiError(401, "Sesi berakhir. Silakan masuk kembali.");
  }

  const retried = await sendRequest(path, options);

  if (retried.status === 401) {
    notifySessionExpired();
    const payload = await readPayload(retried);
    throw new ApiError(
      401,
      extractMessage(payload, "Sesi berakhir. Silakan masuk kembali."),
      payload,
    );
  }

  return retried;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const response = await requestWithRefresh(path, options);

  if (!response.ok && response.status === 401) {
    const payload = await readPayload(response);
    throw new ApiError(
      response.status,
      extractMessage(payload, "Sesi tidak valid atau sudah berakhir."),
      payload,
    );
  }

  return parseResponse<T>(response);
}

export async function apiDownload(
  path: string,
  options: Omit<ApiRequestOptions, "method" | "body"> = {},
): Promise<Response> {
  const response = await requestWithRefresh(path, {
    ...options,
    method: "GET",
  });

  if (!response.ok) {
    const payload = await readPayload(response);
    throw new ApiError(
      response.status,
      extractMessage(payload, "Gagal mengunduh berkas."),
      payload,
    );
  }

  return response;
}

export function apiGet<T>(
  path: string,
  options: Omit<ApiRequestOptions, "method" | "body"> = {},
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: "GET" });
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  options: Omit<ApiRequestOptions, "method" | "body"> = {},
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: "POST", body });
}

export function apiPatch<T>(
  path: string,
  body?: unknown,
  options: Omit<ApiRequestOptions, "method" | "body"> = {},
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: "PATCH", body });
}

export function apiDelete<T>(
  path: string,
  options: Omit<ApiRequestOptions, "method" | "body"> = {},
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: "DELETE" });
}
