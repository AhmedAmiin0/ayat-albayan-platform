import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../common/audit/audit.service';
import type { NumbersConfig } from './config/numbers.config';
import { NumbersEffects } from './numbers.effects';
import type { OwnNumbers } from './own/own-numbers';

const entry = { actorId: 'admin-1', entity: 'wa_number', entityId: 'n1', action: 'update', before: null, after: null };

function effects(failAudit = false) {
  const order: string[] = [];
  const audit = { record: vi.fn(async () => (order.push('audit'), failAudit ? Promise.reject(new Error('x')) : undefined)) };
  const config = { reload: vi.fn(async () => (order.push('reload'), true)) };
  const own = { forget: vi.fn(() => order.push('own')) };
  vi.stubGlobal('fetch', () => (order.push('kick'), Promise.resolve(new Response(null, { status: 204 }))));
  const fx = new NumbersEffects(audit as unknown as AuditService, config as unknown as NumbersConfig, own as unknown as OwnNumbers);
  return { fx, order };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('NumbersEffects.after: a numbers write reaches the worker', () => {
  it('api copy: the local reload, then the worker kick (even when the audit write failed)', async () => {
    vi.stubEnv('APP_ROLE', 'api');
    vi.stubEnv('WORKER_URL', 'http://ayat-worker:3000');
    const { fx, order } = effects(true);
    await expect(fx.after(entry)).rejects.toThrow('x');
    expect(order).toEqual(['audit', 'own', 'reload', 'kick']);
  });

  it('one process (APP_ROLE unset): the local reload only', async () => {
    const { fx, order } = effects();
    await fx.after(entry);
    expect(order).toEqual(['audit', 'own', 'reload']);
  });
});
