/** Non-2xx API response. `body` is the parsed JSON error (e.g. duplicate candidates on 409), if any. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown = null) {
    super(`API ${status}`);
    this.status = status;
    this.body = body;
  }
}

/** The reply body: JSON when it parses, the raw text otherwise, undefined when empty (204). */
export async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
