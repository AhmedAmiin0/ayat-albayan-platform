/** A 2xx whose body the schema rejects (the body itself is never kept). */
export class HttpShapeError extends Error {
  constructor(where, status) {
    super(`${where}: unexpected response (HTTP ${status})`);
    this.name = 'HttpShapeError';
    this.status = status;
  }
}
