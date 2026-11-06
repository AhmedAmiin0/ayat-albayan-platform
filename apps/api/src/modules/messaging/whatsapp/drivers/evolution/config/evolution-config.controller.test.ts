import { evolutionConfigSchema, type EvolutionSyncView } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { NumbersEvolution } from '@/modules/messaging/numbers';
import { EVO_BAILEYS } from '@/modules/messaging/whatsapp/drivers/evolution/evolution.fakes';
import { EvolutionConfigController } from './evolution-config.controller';

// Review fix 9: a failed push never leaves the old «متزامن»: synced false is stored first, and
// the answer to a save says the options were saved but not pushed. All HTTP faked.

const ID = '00000000-0000-4000-8000-000000000001';
const USER = { id: 'admin-1' } as never;
const down = async (): Promise<Response> => {
  throw new TypeError('fetch failed');
};

function setup() {
  const saved: EvolutionSyncView[] = [];
  const numbers = {
    saveConfig: vi.fn(async () => undefined),
    saveSync: vi.fn(async (_id: string, view: EvolutionSyncView) => {
      saved.push(view);
    }),
    pushInput: vi.fn(async () => ({
      env: EVO_BAILEYS, config: evolutionConfigSchema.parse({}), hookUrl: null, globalKey: null,
      proxyPassword: null, fetch: down,
    })),
  };
  const c = new EvolutionConfigController(numbers as unknown as NumbersEvolution);
  return { c, numbers, saved };
}

const caught = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e);

describe('EvolutionConfigController', () => {
  it('Evolution unreachable on save: stores synced false, answers 502 saved', async () => {
    const { c, saved } = setup();
    const e = await caught(c.config(ID, evolutionConfigSchema.parse({}), USER));
    expect(e).toBeInstanceOf(HttpException);
    expect((e as HttpException).getStatus()).toBe(502);
    expect((e as HttpException).getResponse()).toMatchObject({ code: 'evolution_unreachable', saved: true });
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ synced: false, parts: { instance: 'failed', webhook: 'failed' } });
  });

  it('not configured (409) on a plain push: synced false, no «saved» flag', async () => {
    const { c, numbers, saved } = setup();
    const conflict = new HttpException({ code: 'evolution_not_configured' }, 409);
    numbers.pushInput.mockRejectedValueOnce(conflict);
    const e = await caught(c.push(ID));
    expect(e).toBe(conflict);
    expect(saved[0]?.synced).toBe(false);
  });
});
