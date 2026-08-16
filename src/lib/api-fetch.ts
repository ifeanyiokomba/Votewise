"use client";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message: string; code?: string; details?: unknown };
}

export async function apiFetch<T>(
  url: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      credentials: "include",
    });
    const text = await res.text();
    const data = text ? (JSON.parse(text) as ApiResponse<T>) : undefined;
    if (!res.ok || !data || data.success === false) {
      return {
        success: false,
        error: data?.error ?? { message: `Request failed (${res.status})` },
      };
    }
    return data;
  } catch (e) {
    return {
      success: false,
      error: {
        message: e instanceof Error ? e.message : "Network error",
      },
    };
  }
}
