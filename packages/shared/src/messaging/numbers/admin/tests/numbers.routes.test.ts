import { describe, expect, it } from 'vitest';
import { numbersRoutes as routes } from '..';
import { IMPORT, NUMBER } from './numbers.fixtures';

const ID = NUMBER.id;

describe('numbersRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /admin/numbers',
      'GET /admin/numbers/own-traffic',
      'POST /admin/numbers',
      'POST /admin/numbers/import',
      'PATCH /admin/numbers/:id',
      'DELETE /admin/numbers/:id',
      'PUT /admin/numbers/:id/secrets/:name',
      'DELETE /admin/numbers/:id/secrets/:name',
    ]);
  });

  it('lets reads in with settings.read and writes with numbers.manage, all tagged numbers', () => {
    const reads = [routes.list, routes.ownTraffic].map((r) => r.permissions);
    expect(reads).toEqual([['settings.read'], ['settings.read']]);
    const writes = [routes.create, routes.import, routes.update, routes.remove];
    const secrets = [routes.setSecret, routes.clearSecret];
    const permissions = [...writes, ...secrets].map((r) => r.permissions);
    expect(new Set(permissions.flat())).toEqual(new Set(['numbers.manage']));
    expect(new Set(Object.values(routes).flatMap((r) => r.tags))).toEqual(new Set(['numbers']));
  });

  it('answers the list, the week of own traffic and an empty delete', () => {
    expect(routes.list.response.parse([NUMBER])).toEqual([NUMBER]);
    expect(routes.ownTraffic.response.parse({ inbound_7d: 3 })).toEqual({ inbound_7d: 3 });
    expect(routes.remove.response).toBe('empty');
  });

  it('refuses a number view with a secret value or an unknown provider', () => {
    const bad = [
      { ...NUMBER, provider: 'twilio' },
      { ...NUMBER, secrets: { ...NUMBER.secrets, access_token: { set: true } } },
      { ...NUMBER, health: { ok: true } },
    ];
    expect(bad.filter((v) => routes.list.response.safeParse([v]).success)).toEqual([]);
  });

  it('reads an import preview with a role that cannot be imported', () => {
    expect(routes.import.response.parse(IMPORT)).toEqual(IMPORT);
    expect(routes.import.body.safeParse({ dryRun: 'yes' }).success).toBe(false);
  });

  it('takes a uuid id, and a known secret name with a value', () => {
    expect(routes.update.params.safeParse({ id: 'x' }).success).toBe(false);
    expect(routes.setSecret.params.parse({ id: ID, name: 'app_secret' })).toEqual({
      id: ID,
      name: 'app_secret',
    });
    expect(routes.clearSecret.params.safeParse({ id: ID, name: 'token' }).success).toBe(false);
    expect(routes.setSecret.body.safeParse({ value: ' ' }).success).toBe(false);
  });
});
