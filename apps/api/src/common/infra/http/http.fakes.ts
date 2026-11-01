import type { ErrorTable } from './errors';
import type { FetchLike, HttpFailure } from './failure';
import type { HttpProfile } from './http.types';

// Test doubles for the core: a table that records the key it took, transports that misbehave.

export class TestError extends Error {
  constructor(
    readonly key: string,
    readonly failure: HttpFailure,
  ) {
    super(`${key}: ${failure.where}`);
  }
}

const entry =
  (key: string) =>
  (failure: HttpFailure): TestError =>
    new TestError(key, failure);

/** Every key the lookup knows, each building a TestError named after its key. */
export const fullTable: ErrorTable<TestError> = {
  404: entry('404'),
  '4xx': entry('4xx'),
  '5xx': entry('5xx'),
  timeout: entry('timeout'),
  network: entry('network'),
  shape: entry('shape'),
  default: entry('default'),
};

export const defaultOnly: ErrorTable<TestError> = { default: entry('default') };

interface ProfileInput {
  fetch: FetchLike;
  errors?: ErrorTable<TestError>;
  timeoutMs?: number;
  errorBody?: HttpProfile<TestError>['errorBody'];
}

export function profileOf(input: ProfileInput): HttpProfile<TestError> {
  return {
    name: 'test',
    base: () => 'https://peer.invalid/v1',
    headers: () => Promise.resolve({ 'x-api-key': 'profile-key' }),
    timeoutMs: input.timeoutMs ?? 1_000,
    redirect: 'error',
    errorBody: input.errorBody ?? 'omit',
    errors: input.errors ?? fullTable,
    fetch: input.fetch,
  };
}

/** A transport that answers `res` and records each call. */
export function answering(res: () => Response): FetchLike & { calls: [string, RequestInit][] } {
  const calls: [string, RequestInit][] = [];
  const fetch = (url: string, init: RequestInit): Promise<Response> => {
    calls.push([url, init]);
    return Promise.resolve(res());
  };
  return Object.assign(fetch, { calls });
}

/** A transport that never answers and ignores its signal. */
export const hanging: FetchLike = () => new Promise<Response>(() => undefined);

/** undici's shape: `TypeError('fetch failed', { cause: { code } })`. */
export const errno = (code: string): TypeError =>
  new TypeError('fetch failed', { cause: { code } });

export const failing =
  (error: unknown): FetchLike =>
  () =>
    Promise.reject(error instanceof Error ? error : new Error(String(error)));

/** A 2xx whose body stream breaks after one chunk. */
export function brokenBody(): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2]));
      controller.error(new Error('socket hang up'));
    },
  });
  return new Response(stream, { status: 200 });
}

/** A 2xx streaming `chunks` chunks of `size` bytes, with no content-length. */
export function streaming(chunks: number, size: number): Response {
  let sent = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      sent += 1;
      controller.enqueue(new Uint8Array(size));
      if (sent >= chunks) controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'audio/ogg' } });
}

/** The error a call failed with (a call that succeeds fails the test). */
export async function caught(call: Promise<unknown>): Promise<TestError> {
  return call.then(
    () => {
      throw new Error('expected a failure');
    },
    (e: unknown) => e as TestError,
  );
}
