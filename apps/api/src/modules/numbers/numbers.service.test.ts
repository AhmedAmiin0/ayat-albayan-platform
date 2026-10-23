import { describe, expect, it, vi } from 'vitest';
import type { NumbersEffects } from './numbers.effects';
import { numberRow } from './numbers.fakes';
import type { NumbersQueries } from './numbers.queries';
import type { NumbersSecrets } from './numbers.secrets';
import { NumbersService } from './numbers.service';

function setup(row = numberRow()) {
  const queries = {
    byId: vi.fn(async () => row), all: vi.fn(async () => [row]), insert: vi.fn(async () => row),
    update: vi.fn(async () => row), makeDefault: vi.fn(async () => true), remove: vi.fn(async () => true),
  };
  const secrets = { status: vi.fn(async () => new Map()), set: vi.fn(async () => undefined), clear: vi.fn(async () => true) };
  const effects = { after: vi.fn(async () => undefined) };
  const svc = new NumbersService(queries as unknown as NumbersQueries, secrets as unknown as NumbersSecrets, effects as unknown as NumbersEffects);
  return { svc, queries, secrets, effects };
}

describe('NumbersService', () => {
  it('create audits the row (no secrets) and refreshes the config through effects', async () => {
    const t = setup();
    await t.svc.create({ label: 'رقم', purpose: 'chat', provider: 'meta', phone_number_id: '1000000002', enabled: false }, 'actor');
    expect(t.effects.after).toHaveBeenCalledWith(expect.objectContaining({ entity: 'wa_numbers', action: 'create' }));
  });

  it('is_default true goes through the atomic RPC; false is a plain update', async () => {
    const t = setup();
    await t.svc.update(numberRow().id, { is_default: true }, 'actor');
    expect(t.queries.makeDefault).toHaveBeenCalledWith(numberRow().id, 'actor');
    expect(t.queries.update).not.toHaveBeenCalled();
    await t.svc.update(numberRow().id, { is_default: false, label: 'جديد' }, 'actor');
    expect(t.queries.update).toHaveBeenCalledWith(numberRow().id, { patch: { label: 'جديد', is_default: false }, actorId: 'actor' });
  });

  it('a role change of a live default unsets is_default in the same update (no silent default move)', async () => {
    const t = setup(numberRow({ purpose: 'notifications', is_default: true }));
    await t.svc.update(numberRow().id, { purpose: 'chat' }, 'actor');
    expect(t.queries.update).toHaveBeenCalledWith(numberRow().id, { patch: { purpose: 'chat', is_default: false }, actorId: 'actor' });
  });

  it('making a disabled number the default is 409 not_enabled', async () => {
    const t = setup();
    t.queries.makeDefault.mockResolvedValueOnce(false);
    await expect(t.svc.update(numberRow().id, { is_default: true }, 'actor')).rejects.toMatchObject({ status: 409, response: { message: 'not_enabled' } });
  });

  it('delete refuses an enabled number (409 number_enabled); a missing one is 404', async () => {
    const t = setup(numberRow({ enabled: true }));
    await expect(t.svc.remove(numberRow().id, 'actor')).rejects.toMatchObject({ status: 409 });
    expect(t.queries.remove).not.toHaveBeenCalled();
    t.queries.byId.mockResolvedValueOnce(null as never);
    await expect(t.svc.remove(numberRow().id, 'actor')).rejects.toMatchObject({ status: 404 });
  });

  it('a secret write audits the NAME only, never the value', async () => {
    const t = setup();
    await t.svc.setSecret({ id: numberRow().id, name: 'access_token', value: 'token-fake' }, 'actor');
    expect(t.secrets.set).toHaveBeenCalledWith({ id: numberRow().id, name: 'access_token' }, 'token-fake');
    expect(JSON.stringify(t.effects.after.mock.calls)).not.toContain('token-fake');
  });

  it('turning a number off while making it the default is 409 not_enabled before anything is written', async () => {
    const t = setup(numberRow({ is_default: false }));
    await expect(t.svc.update(numberRow().id, { enabled: false, is_default: true }, 'actor')).rejects.toMatchObject({ status: 409, response: { message: 'not_enabled' } });
    expect(t.queries.update).not.toHaveBeenCalled();
    expect(t.queries.makeDefault).not.toHaveBeenCalled();
  });

  it('a patch that was written is audited and refreshes the config even when the default step then fails', async () => {
    const t = setup(numberRow({ is_default: false }));
    t.queries.makeDefault.mockRejectedValueOnce(new Error('default_taken'));
    await expect(t.svc.update(numberRow().id, { label: 'جديد', is_default: true }, 'actor')).rejects.toThrow('default_taken');
    expect(t.effects.after).toHaveBeenCalledWith(expect.objectContaining({ entity: 'wa_numbers', action: 'update' }));
  });
});
