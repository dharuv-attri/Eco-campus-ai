export type ApiResult<T = Record<string, unknown>> = T & {
  ok?: boolean;
  error?: string;
};

/** Small typed wrapper around fetch for client components. */
export async function apiRequest<T = Record<string, unknown>>(
  url: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers ?? {}),
    },
  });
  let data = {} as ApiResult<T>;
  try {
    data = (await response.json()) as ApiResult<T>;
  } catch {
    data = {
      ok: false,
      error: "The server returned an unexpected response.",
    } as ApiResult<T>;
  }
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status}).`);
  }
  return data;
}

export async function postJson<T = Record<string, unknown>>(url: string, body: unknown) {
  return await apiRequest<T>(url, { method: "POST", body: JSON.stringify(body) });
}

export async function patchJson<T = Record<string, unknown>>(url: string, body: unknown) {
  return await apiRequest<T>(url, { method: "PATCH", body: JSON.stringify(body) });
}

export async function deleteJson<T = Record<string, unknown>>(url: string, body?: unknown) {
  return await apiRequest<T>(url, {
    method: "DELETE",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function safeNextPath(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
