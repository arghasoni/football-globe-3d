export class HttpError extends Error {
  constructor(
    public status: number,
    url: string,
  ) {
    super(`HTTP ${status} for ${url}`)
  }
}

export async function fetchJson<T = unknown>(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 8000,
): Promise<T> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new HttpError(res.status, url)
  return (await res.json()) as T
}
