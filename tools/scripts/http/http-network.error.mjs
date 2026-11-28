/** No answer at all (DNS, refused, a malformed URL): fetch's own message is not kept. */
export class HttpNetworkError extends Error {
  constructor(where) {
    super(`${where}: request failed`);
    this.name = 'HttpNetworkError';
  }
}
