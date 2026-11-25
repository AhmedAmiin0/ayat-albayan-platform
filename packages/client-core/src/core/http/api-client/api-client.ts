import { UPLOAD_CAPABILITY_HEADER, UPLOAD_SLOT_V2 } from '@ab/shared';
import type { z } from 'zod';
import { ApiError, readJson } from '../api-error';
import { CLIENT_HEADER } from '../client-header';
import { withDeadline } from '../deadline';
import { sendTimeoutFor } from '../timeouts';
import type {
  ApiClient,
  ApiClientOptions,
  SchemaInit,
  SendMethod,
  SendOptions,
} from './api-client.types';
import { parseResponse } from './parse-response';
import { sendParts } from './send-options';

const ignore = (): void => undefined;

type FetchInit = RequestInit & { schema?: z.ZodType };

/** fetch against the Nest API with the access token and the client tag (`X-AB-Client`). */
export function createApiClient(opts: ApiClientOptions): ApiClient {
  async function request(path: string, init: RequestInit): Promise<unknown> {
    const token = await opts.accessToken();
    const headers = new Headers(init.headers);
    headers.set(CLIENT_HEADER, opts.clientTag());
    // This build fills a MinIO slot (signed-upload.ts): the API may sign one (docs/45 §4 step 9).
    headers.set(UPLOAD_CAPABILITY_HEADER, UPLOAD_SLOT_V2);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const send = opts.fetch ?? fetch;
    const res = await send(`${opts.baseUrl()}${path}`, { ...init, headers });
    const body = await readJson(res);
    if (!res.ok) throw new ApiError(res.status, body ?? null);
    return body;
  }

  function apiFetch<S extends z.ZodType>(path: string, init: SchemaInit<S>): Promise<z.output<S>>;
  function apiFetch<T>(path: string, init?: RequestInit): Promise<T>;
  async function apiFetch(path: string, init: FetchInit = {}): Promise<unknown> {
    const { schema, ...rest } = init;
    const body = await request(path, rest);
    return schema === undefined ? body : parseResponse(schema, body, path);
  }

  /**
   * JSON mutation helper for TanStack Query `mutationFn`s. Resolves undefined on 204. Bounded
   * (docs/43 AU10): no answer within sendTimeoutFor(path), token included, rejects as no answer
   * (`TypeError`) and aborts the fetch; isNoAnswer tells that from the API's refusal.
   */
  function apiSend<S extends z.ZodType>(
    method: SendMethod,
    path: string,
    options: SendOptions<S>,
  ): Promise<z.output<S>>;
  function apiSend<T = void>(method: SendMethod, path: string, body?: unknown): Promise<T>;
  function apiSend(method: SendMethod, path: string, arg?: unknown): Promise<unknown> {
    const { body, schema } = sendParts(arg);
    const init: FetchInit = { method, schema };
    if (body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    const send = (signal: AbortSignal) => apiFetch(path, { ...init, signal });
    const timeoutMs = sendTimeoutFor(path);
    return withDeadline(send, { onTimeout: opts.onStall ?? ignore, timeoutMs });
  }

  return { apiFetch, apiSend };
}
