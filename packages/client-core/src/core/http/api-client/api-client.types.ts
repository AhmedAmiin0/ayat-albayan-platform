import type { z } from 'zod';
import type { StallStage } from '../deadline';

export type SendMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

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
