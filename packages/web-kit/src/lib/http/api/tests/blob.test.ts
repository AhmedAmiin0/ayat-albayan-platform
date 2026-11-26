import { READ_TIMEOUT_MS } from '@ab/client-core';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiBlob } from '@ab/web-kit/lib/http/api/api';

vi.mock('@ab/web-kit/lib/http/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
  },
}));

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

it("a file is read with the session's token and the web client tag", async () => {
  fetchMock.mockResolvedValue(new Response('"a"\r\n'));
  const { blob } = await apiBlob('/exports/students.csv');
  expect(await blob.text()).toBe('"a"\r\n');
  const sent = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
  expect(sent.get('Authorization')).toBe('Bearer tok');
  expect(sent.get('X-AB-Client')).toMatch(/^web\//);
});

it('a slow export is not cut at the read deadline', async () => {
  vi.useFakeTimers();
  let answer: (res: Response) => void = () => undefined;
  fetchMock.mockImplementation(() => new Promise<Response>((resolve) => (answer = resolve)));
  const file = apiBlob('/exports/lessons.csv');
  await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS * 2);
  expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).not.toBe(true);
  answer(new Response('ok'));
  await expect(file).resolves.toMatchObject({ headers: expect.any(Headers) });
});
