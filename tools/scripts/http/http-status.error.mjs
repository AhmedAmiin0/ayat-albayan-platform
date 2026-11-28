/** A non-2xx answer. */
export class HttpStatusError extends Error {
  constructor(where, { status, code }) {
    super(`${where}: HTTP ${status} (${code})`);
    this.name = 'HttpStatusError';
    this.status = status;
    this.code = code;
  }
}
