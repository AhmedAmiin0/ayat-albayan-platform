import { UPLOAD_CAPABILITY_HEADER, UPLOAD_SLOT_V2 } from '@ab/shared';
import type { z } from 'zod';
import { ApiError, readJson } from '../api-error';
import { CLIENT_HEADER } from '../client-header';
import { withDeadline } from '../deadline';
import { sendTimeoutFor } from '../timeouts';
import { isRead } from '../timeouts';
import type {
  ApiBlob,
  ApiClient,
  ApiClientOptions,
  ApiRequest,
  BlobClient,
  Requester,
  SchemaInit,
  SchemaRequest,
  SendMethod,
  SendOptions,
} from './api-client.types';
import { parseResponse } from './parse-response';
import { requestInit } from './request-init';
import { sendParts } from './send-options';

const ignore = (): void => undefined;

type FetchInit = RequestInit & { schema?: z.ZodType };

/** The API's answer once it is 2xx; anything else throws ApiError with the parsed error body. */
async function respond(opts: ApiClientOptions, path: string, init: RequestInit): Promise<Response> {
  const token = await opts.accessToken();
  const headers = new Headers(init.headers);
  headers.set(CLIENT_HEADER, opts.clientTag());
  // This build fills a MinIO slot (signed-upload.ts): the API may sign one (docs/45 §4 step 9).
  headers.set(UPLOAD_CAPABILITY_HEADER, UPLOAD_SLOT_V2);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const send = opts.fetch ?? fetch;
  const credentials = opts.credentials ? { credentials: opts.credentials } : {};
  const res = await send(`${opts.baseUrl()}${path}`, { ...init, headers, ...credentials });
  if (!res.ok) throw new ApiError(res.status, (await readJson(res)) ?? null);
  return res;
}

/** fetch against the Nest API with the access token and the client tag (`X-AB-Client`). */
export function createApiClient(opts: ApiClientOptions): ApiClient & Requester & BlobClient {
  async function exchange(path: string, init: RequestInit, schema?: z.ZodType): Promise<unknown> {
    const body = await readJson(await respond(opts, path, init));
    return schema === undefined ? body : parseResponse(schema, body, path);
  }

  /**
   * Resolves undefined on 204. A write is bounded (docs/43 AU10): no answer within
   * sendTimeoutFor(path), token included, rejects as no answer (`TypeError`) and aborts the fetch;
   * isNoAnswer tells that from the API's refusal. A read's deadline is the kit's.
   */
  function request<S extends z.ZodType>(request: SchemaRequest<S>): Promise<z.output<S>>;
  function request<T = unknown>(request: ApiRequest): Promise<T>;
  function request(request: ApiRequest): Promise<unknown> {
    const init = requestInit(request);
    const run = (signal: AbortSignal | null | undefined): Promise<unknown> =>
      exchange(request.path, { ...init, signal }, request.schema);
    if (isRead(init)) return run(request.signal);
    const timeoutMs = sendTimeoutFor(request.path);
    const onTimeout = opts.onStall ?? ignore;
    return withDeadline(run, { signal: request.signal, onTimeout, timeoutMs });
  }

  // docs/62 part 3 §3b F deletes it: sends init as given, with no deadline of its own.
  function apiFetch<S extends z.ZodType>(path: string, init: SchemaInit<S>): Promise<z.output<S>>;
  function apiFetch<T>(path: string, init?: RequestInit): Promise<T>;
  function apiFetch(path: string, init: FetchInit = {}): Promise<unknown> {
    const { schema, ...rest } = init;
    return exchange(path, rest, schema);
  }

  // docs/62 part 3 §3b F deletes it: the third argument is a body or `{ body, schema }`.
  function apiSend<S extends z.ZodType>(
    method: SendMethod,
    path: string,
    options: SendOptions<S>,
  ): Promise<z.output<S>>;
  function apiSend<T = void>(method: SendMethod, path: string, body?: unknown): Promise<T>;
  function apiSend(method: SendMethod, path: string, arg?: unknown): Promise<unknown> {
    return request({ method, path, ...sendParts(arg) });
  }

  /** A file (CSV export…): its bytes and headers. No deadline: a large export takes its time. */
  async function apiBlob(path: string, init: RequestInit = {}): Promise<ApiBlob> {
    const res = await respond(opts, path, init);
    return { blob: await res.blob(), headers: res.headers };
  }

  return { apiBlob, apiFetch, apiSend, request };
}
