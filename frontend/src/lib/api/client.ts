/**
 * Klien HTTP dasar untuk API Sagara Denim.
 *
 * Secara bawaan request memakai path relatif `/api` sehingga melewati rewrite
 * Next.js dan cookie autentikasi tetap same-origin.
 */

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
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

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

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, query, headers, ...init } = options;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  if (body !== undefined && !isFormData && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path, query), {
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
  });

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
