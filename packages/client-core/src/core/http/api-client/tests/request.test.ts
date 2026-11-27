import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, apiErrorCode, createApiClient, SEND_TIMEOUT_MS } from '../../../..';

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const client = (onStall = vi.fn()) =>
  createApiClient({
    baseUrl: () => 'http://api.test',
    accessToken: async () => 'tok',
    clientTag: () => 'web/dev',
    onStall,
  });
const reply = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));
const sent = (): RequestInit => fetchMock.mock.calls.at(-1)?.[1] ?? {};
const header = (name: string): string | null => new Headers(sent().headers).get(name);
const lead = z.object({ id: z.string() });

describe('request', () => {
  it('reads with GET by default, tagged, with the token and the upload capability', async () => {
    reply({ id: 'l1' });
    await expect(client().request({ path: '/leads/l1' })).resolves.toEqual({ id: 'l1' });
    expect(fetchMock).toHaveBeenLastCalledWith('http://api.test/leads/l1', expect.anything());
    expect(sent().method).toBe('GET');
    expect(sent().body).toBeUndefined();
    expect(header('Authorization')).toBe('Bearer tok');
    expect(header('X-AB-Client')).toBe('web/dev');
    expect(header('X-AB-Upload')).toBe('slot-v2');
  });

  it('sends a body as JSON with its method, keeping the caller headers', async () => {
    reply({ id: 'l2' }, 201);
    const headers = { 'Idempotency-Key': 'k1' };
    await client().request({ method: 'POST', path: '/leads', body: { n: 'هدى' }, headers });
    expect(sent().method).toBe('POST');
    expect(sent().body).toBe('{"n":"هدى"}');
    expect(header('Content-Type')).toBe('application/json');
    expect(header('Idempotency-Key')).toBe('k1');
  });

  it('parses the answer with the schema and reports a mismatch as bad_response', async () => {
    reply({ id: 'l1', extra: 1 });
    await expect(client().request({ path: '/leads/l1', schema: lead })).resolves.toEqual({
      id: 'l1',
    });
    reply({ id: 7 });
    const error = await client()
      .request({ path: '/leads/l1', schema: lead })
      .catch((e: unknown) => e);
    expect(apiErrorCode(error)).toBe('bad_response');
  });

  it('throws ApiError with the parsed body on a non-2xx answer', async () => {
    reply({ code: 'lead_not_found' }, 404);
    const error = await client()
      .request({ method: 'DELETE', path: '/leads/l1' })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, body: { code: 'lead_not_found' } });
  });

  it('resolves undefined on 204', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(client().request({ method: 'DELETE', path: '/x' })).resolves.toBeUndefined();
  });

  it('hands the caller signal to fetch on a read', async () => {
    reply({});
    const abort = new AbortController();
    await client().request({ path: '/x', signal: abort.signal });
    expect(sent().signal).toBe(abort.signal);
  });
});

describe('request deadlines', () => {
  const never = () => new Promise<Response>(() => undefined);

  it('ends a write with no answer at the send deadline and reports the stall', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(never);
    const onStall = vi.fn();
    const write = client(onStall).request({ method: 'PATCH', path: '/x', body: {} });
    const settled = expect(write).rejects.toEqual(new TypeError('Network request failed'));
    await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS);
    await settled;
    expect(onStall).toHaveBeenCalledTimes(1);
    expect(sent().signal?.aborted).toBe(true);
  });

  it('lets the caller signal end a write at once', async () => {
    fetchMock.mockImplementation(never);
    const abort = new AbortController();
    const write = client().request({ method: 'POST', path: '/x', signal: abort.signal });
    await Promise.resolve();
    abort.abort();
    await expect(write).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('puts no deadline on a read: the kit adds the read deadline', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(never);
    const onDone = vi.fn();
    void client().request({ path: '/x' }).then(onDone, onDone);
    await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS * 2);
    expect(onDone).not.toHaveBeenCalled();
  });
});
