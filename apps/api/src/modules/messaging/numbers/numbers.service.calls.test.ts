import { describe, expect, it, vi } from 'vitest';
import type { NumbersEffects } from './numbers.effects';
import { numberRow } from './numbers.fakes';
import type { NumbersQueries } from './numbers.queries';
import type { NumbersSecrets } from './config/numbers.secrets';
import { NumbersService } from './numbers.service';

// A calls number is Kapso only (docs/28 §10): a PATCH that would make a non-Kapso calls number is refused.

function setup(row = numberRow()) {
  const queries = { byId: vi.fn(async () => row), update: vi.fn(async () => row), makeDefault: vi.fn(async () => true) };
  const secrets = { status: vi.fn(async () => new Map()) };
  const effects = { after: vi.fn(async () => undefined) };
  const svc = new NumbersService(queries as unknown as NumbersQueries, secrets as unknown as NumbersSecrets, effects as unknown as NumbersEffects);
  return { svc, queries };
}

describe('NumbersService and a calls number', () => {
  it('purpose calls on a meta number, or meta on a calls number: 409 calls_need_kapso, nothing written', async () => {
    const meta = setup(numberRow({ provider: 'meta', purpose: 'chat' }));
    await expect(meta.svc.update(numberRow().id, { purpose: 'calls' }, 'a')).rejects.toMatchObject({ response: { message: 'calls_need_kapso' } });
    const calls = setup(numberRow({ provider: 'kapso', purpose: 'calls' }));
    await expect(calls.svc.update(numberRow().id, { provider: 'meta' }, 'a')).rejects.toMatchObject({ response: { message: 'calls_need_kapso' } });
    expect(meta.queries.update).not.toHaveBeenCalled();
    expect(calls.queries.update).not.toHaveBeenCalled();
  });

  it('kapso + calls in one PATCH, or enabling a Kapso calls number as its default, is allowed', async () => {
    const t = setup(numberRow({ provider: 'meta', purpose: 'chat' }));
    await t.svc.update(numberRow().id, { purpose: 'calls', provider: 'kapso' }, 'a');
    expect(t.queries.update).toHaveBeenCalled();
    const d = setup(numberRow({ provider: 'kapso', purpose: 'calls', enabled: true }));
    await d.svc.update(numberRow().id, { is_default: true }, 'a');
    expect(d.queries.makeDefault).toHaveBeenCalled();
  });
});
