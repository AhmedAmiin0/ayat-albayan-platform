import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { linksApp } from '@/modules/platform/short-links-admin/short-links-admin.app.fakes';

type App = Awaited<ReturnType<typeof linksApp>>;
type Request = Omit<Parameters<App['call']>[0], 'token'>;
const BAD_CODE = 'no';
const NOT_FOUND = [404, { code: 'short_link_not_found', message: 'short_link_not_found' }];
const invalid = (...issues: [path: string, message: string][]) => [
  400,
  { message: 'validation_failed', issues: issues.map(([path, message]) => ({ path, message })) },
];
const missing = 'Invalid input: expected string, received undefined';

// Pins each managed route's answer to a bad input, so moving the routes onto route objects keeps
// the same status, the same body and the same winner when two inputs are bad.
describe('the managed short-link routes refuse bad input as before (docs/19)', () => {
  let t: App;
  beforeAll(async () => {
    t = await linksApp();
  });
  afterAll(() => t.app.close());

  const answer = async (req: Request) => {
    const res = await t.call({ ...req, token: 'admin' });
    return [res.statusCode, res.json<object>()];
  };

  it.each<[string, Request, unknown[]]>([
    [
      'a page size above 100',
      { method: 'GET', url: '/short-links?pageSize=101' },
      invalid(['pageSize', 'Too big: expected number to be <=100']),
    ],
    [
      'a page past 10000',
      { method: 'GET', url: '/short-links?page=10001' },
      invalid(['page', 'Too big: expected number to be <=10000']),
    ],
    [
      'a one-letter people search',
      { method: 'GET', url: '/short-links/people?search=a' },
      invalid(['search', 'Too small: expected string to have >=2 characters']),
    ],
    [
      'an empty create body',
      { method: 'POST', url: '/short-links', payload: {} },
      invalid(['title', missing], ['targetUrl', missing]),
    ],
    ['a malformed code', { method: 'GET', url: `/short-links/${BAD_CODE}` }, NOT_FOUND],
    [
      'a malformed code to revoke',
      { method: 'POST', url: `/short-links/${BAD_CODE}/revoke` },
      NOT_FOUND,
    ],
    [
      'a malformed code to resend',
      { method: 'POST', url: `/short-links/${BAD_CODE}/resend` },
      NOT_FOUND,
    ],
    [
      'a malformed code with a good patch',
      { method: 'PATCH', url: `/short-links/${BAD_CODE}`, payload: { title: 'x' } },
      NOT_FOUND,
    ],
    [
      'a malformed code with an empty patch: the body wins',
      { method: 'PATCH', url: `/short-links/${BAD_CODE}`, payload: {} },
      invalid(['', 'empty_update']),
    ],
  ])('%s', async (_name, req, expected) => {
    expect(await answer(req)).toEqual(expected);
  });
});
