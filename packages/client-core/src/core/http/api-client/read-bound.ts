import type { z } from 'zod';
import type { ApiRequest, ReadBound, Requester, SchemaRequest } from './api-client.types';

/**
 * The client's request with a kit's read deadline around it (docs/43 AU9): the bound decides by
 * the method whether to wait, and its signal reaches the fetch.
 */
export function boundReads(client: Requester, bound: ReadBound): Requester {
  function request<S extends z.ZodType>(sent: SchemaRequest<S>): Promise<z.output<S>>;
  function request<T = unknown>(sent: ApiRequest): Promise<T>;
  function request(sent: ApiRequest): Promise<unknown> {
    const init = { method: sent.method ?? 'GET', signal: sent.signal };
    const ask = ({ signal }: RequestInit) => client.request({ ...sent, signal });
    return bound(ask, init, sent.path);
  }
  return { request };
}
