export interface JsonResult<T> {
  ok: boolean;
  data: T | null;
}

export async function requestJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<JsonResult<T>> {
  try {
    const response = await fetch(input, init);
    const data = (await response.json().catch(() => null)) as T | null;
    return { ok: response.ok, data };
  } catch {
    return { ok: false, data: null };
  }
}
