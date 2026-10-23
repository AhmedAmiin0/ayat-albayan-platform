import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { numbersApp } from './test-app';

type App = Awaited<ReturnType<typeof numbersApp>>;
const ID = '00000000-0000-4000-8000-000000000001';

describe('numbers routes: guards (settings.read to read, numbers.manage to write)', () => {
  let t: App;
  beforeAll(async () => {
    t = await numbersApp();
  });
  afterAll(() => t.app.close());

  it('admin reads the numbers and the parity', async () => {
    expect((await t.call({ method: 'GET', url: '/admin/numbers' })).statusCode).toBe(200);
    expect((await t.call({ method: 'GET', url: '/admin/communications/parity' })).statusCode).toBe(200);
  });

  it('teacher and sales are 403 on every route and nothing runs', async () => {
    const routes = [
      { method: 'GET', url: '/admin/numbers' }, { method: 'GET', url: '/admin/communications/parity' },
      { method: 'POST', url: '/admin/numbers/import', body: { dryRun: true } },
      { method: 'POST', url: '/admin/communications/source', body: { source: 'module' } },
      { method: 'PUT', url: `/admin/numbers/${ID}/secrets/access_token`, body: { value: 'fake' } },
    ] as const;
    for (const token of ['teacher', 'sales']) {
      for (const r of routes) expect((await t.call({ ...r, token })).statusCode).toBe(403);
    }
    expect(t.importer.run).not.toHaveBeenCalled();
    expect(t.comms.setSource).not.toHaveBeenCalled();
    expect(t.numbers.setSecret).not.toHaveBeenCalled();
  });

  it('import passes dryRun; a body without it is 400', async () => {
    expect((await t.call({ method: 'POST', url: '/admin/numbers/import', body: { dryRun: true } })).statusCode).toBe(200);
    expect(t.importer.run).toHaveBeenCalledWith(true, expect.any(String));
    expect((await t.call({ method: 'POST', url: '/admin/numbers/import', body: {} })).statusCode).toBe(400);
  });

  it('the source switch takes legacy | module only', async () => {
    expect((await t.call({ method: 'POST', url: '/admin/communications/source', body: { source: 'module' } })).statusCode).toBe(200);
    expect(t.comms.setSource).toHaveBeenCalledWith('module', expect.any(String));
    expect((await t.call({ method: 'POST', url: '/admin/communications/source', body: { source: 'env' } })).statusCode).toBe(400);
  });

  it('a secret name other than access_token / app_secret, or a bad id, is 400', async () => {
    expect((await t.call({ method: 'PUT', url: `/admin/numbers/${ID}/secrets/WA_ACCESS_TOKEN`, body: { value: 'fake' } })).statusCode).toBe(400);
    expect((await t.call({ method: 'DELETE', url: '/admin/numbers/not-a-uuid/secrets/app_secret' })).statusCode).toBe(400);
    expect((await t.call({ method: 'DELETE', url: `/admin/numbers/${ID}/secrets/app_secret` })).statusCode).toBe(200);
    expect(t.numbers.clearSecret).toHaveBeenCalledWith({ id: ID, name: 'app_secret' }, expect.any(String));
  });

});
