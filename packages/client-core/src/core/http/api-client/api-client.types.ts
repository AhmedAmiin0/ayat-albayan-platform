import type { z } from 'zod';
import type { StallStage } from '../deadline';

export type SendMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestMethod = 'GET' | SendMethod;

/** One request to the API (docs/62 part 3 §3b); `body` is sent as JSON when given. */
export interface ApiRequest {
  method?: RequestMethod | undefined;
  path: string;
  body?: unknown;
  schema?: z.ZodType | undefined;
  signal?: AbortSignal | null | undefined;
  headers?: HeadersInit | undefined;
}

/** A kit's read deadline around one send; `init` carries the method and the caller signal. */
export type ReadBound = (
  send: (init: RequestInit) => Promise<unknown>,
  init: RequestInit,
  path: string,
) => Promise<unknown>;

/** A request whose answer is parsed with `schema`. */
export type SchemaRequest<S extends z.ZodType> = ApiRequest & { schema: S };

/** What call() needs from an api client: its one request. */
export interface Requester {
  request<S extends z.ZodType>(request: SchemaRequest<S>): Promise<z.output<S>>;
  request<T = unknown>(request: ApiRequest): Promise<T>;
}

/** What an app injects: where the API lives, the session token and its client tag (docs/26 §2f). */
export interface ApiClientOptions {
  /** The API origin, read on every call (tests and env switches). */
  baseUrl: () => string;
  /** The current access token, or null when signed out. */
  accessToken: () => Promise<string | null>;
  /** `web/<build>` or `mobile/<build>`. */
  clientTag: () => string;
  /** The transport; mobile wraps fetch to report reachability. Default: global fetch. */
  fetch?: (url: string, init: RequestInit) => Promise<Response>;
  /** A write passed its deadline (mobile tells its connection state). Default: nothing. */
  onStall?: (stage: StallStage) => void;
}

/** A read whose answer is parsed with `schema` (docs/36 h3). */
export type SchemaInit<S extends z.ZodType> = RequestInit & { schema: S };

/** A write whose answer is parsed with `schema`; `body` is sent as JSON when given. */
export interface SendOptions<S extends z.ZodType> {
  body?: unknown;
  schema: S;
}

/** A file the API sent: its bytes and the response headers (Content-Disposition…). */
export interface ApiBlob {
  blob: Blob;
  headers: Headers;
}

/** Files (CSV exports): what createApiClient adds to the JSON calls. */
export interface BlobClient {
  apiBlob(path: string, init?: RequestInit): Promise<ApiBlob>;
}

/**
 * The schema overloads parse the answer and throw `bad_response` on a mismatch. The generic ones
 * stay for blobs, 204s and the calls not moved to a schema yet.
 */
export interface ApiClient {
  apiFetch<S extends z.ZodType>(path: string, init: SchemaInit<S>): Promise<z.output<S>>;
  apiFetch<T>(path: string, init?: RequestInit): Promise<T>;
  apiSend<S extends z.ZodType>(
    method: SendMethod,
    path: string,
    options: SendOptions<S>,
  ): Promise<z.output<S>>;
  apiSend<T = void>(method: SendMethod, path: string, body?: unknown): Promise<T>;
}
