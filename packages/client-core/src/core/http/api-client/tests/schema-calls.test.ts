import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, apiErrorCode, createApiClient, parseResponse } from '../../../..';

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const client = () =>
  createApiClient({
    baseUrl: () => 'http://api.test',
    accessToken: async () => 'tok',
    clientTag: () => 'web/dev',
  });
const reply = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));
const lead = z.object({ id: z.string(), name: z.string() });

async function caught(work: Promise<unknown>): Promise<ApiError> {
  const error: unknown = await work.then(
    () => null,
    (e: unknown) => e,
  );
  if (error instanceof ApiError) return error;
  throw new Error('expected an ApiError');
}

describe('parseResponse', () => {
  it('returns the parsed body, without keys the schema does not declare', () => {
    expect(parseResponse(lead, { id: 'l1', name: 'Sara', extra: 1 }, '/leads/l1')).toEqual({
      id: 'l1',
      name: 'Sara',
    });
  });

  it('throws bad_response with the failing paths and never the values', () => {
    const error = (() => {
      try {
        parseResponse(lead, { id: 'l1', name: 42 }, '/leads/l1?q=+201001234567');
      } catch (e: unknown) {
        return e;
      }
      return null;
    })();
    expect(apiErrorCode(error)).toBe('bad_response');
    expect(error).toBeInstanceOf(ApiError);
    const body = error instanceof ApiError ? error.body : null;
    expect(body).toEqual({ code: 'bad_response', path: '/leads/l1', issues: ['name'] });
    expect(JSON.stringify(body)).not.toContain('42');
  });
});

describe('apiFetch with a schema', () => {
  it('parses the answer with the schema', async () => {
    reply({ id: 'l1', name: 'Sara', phone: '+201001234567' });
    await expect(client().apiFetch('/leads/l1', { schema: lead })).resolves.toEqual({
      id: 'l1',
      name: 'Sara',
    });
  });

  it('rejects an answer that breaks the contract', async () => {
    reply({ id: 'l1' });
    const error = await caught(client().apiFetch('/leads/l1', { schema: lead }));
    expect(apiErrorCode(error)).toBe('bad_response');
  });

  it('keeps the API refusal when the status is not ok', async () => {
    reply({ code: 'lead_not_found' }, 404);
    const error = await caught(client().apiFetch('/leads/l1', { schema: lead }));
    expect(error.status).toBe(404);
    expect(apiErrorCode(error)).toBe('lead_not_found');
  });

  it('sends the other init fields and no schema key', async () => {
    reply({ id: 'l1', name: 'Sara' });
    await client().apiFetch('/leads/l1', { schema: lead, headers: { Accept: 'application/json' } });
    const init = fetchMock.mock.calls.at(-1)?.[1] ?? {};
    expect(new Headers(init.headers).get('Accept')).toBe('application/json');
    expect(init).not.toHaveProperty('schema');
  });
});

describe('apiSend with a schema', () => {
  it('sends the body and parses the answer', async () => {
    reply({ id: 'l2', name: 'Huda' }, 201);
    const created = client().apiSend('POST', '/leads', { body: { name: 'Huda' }, schema: lead });
    await expect(created).resolves.toEqual({ id: 'l2', name: 'Huda' });
    expect(fetchMock.mock.calls.at(-1)?.[1]?.body).toBe('{"name":"Huda"}');
  });

  it('sends no body when the options carry none', async () => {
    reply({ id: 'l2', name: 'Huda' });
    await client().apiSend('POST', '/leads/l2/revoke', { schema: lead });
    expect(fetchMock.mock.calls.at(-1)?.[1]?.body).toBeUndefined();
  });

  it('still sends a plain body as before', async () => {
    reply({ ok: true });
    await client().apiSend('POST', '/leads', { name: 'Huda', schema: 'not a zod schema' });
    expect(fetchMock.mock.calls.at(-1)?.[1]?.body).toBe(
      '{"name":"Huda","schema":"not a zod schema"}',
    );
  });
});
