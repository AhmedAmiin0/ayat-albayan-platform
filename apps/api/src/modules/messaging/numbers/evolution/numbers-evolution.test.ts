import { evolutionConfigSchema } from '@ab/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setIntegrationOverlay } from '@/common/configuration/integrations/integration-overlay';
import type { NumbersSecrets } from '@/modules/messaging/numbers/config/numbers.secrets';
import type { NumbersEffects } from '@/modules/messaging/numbers/numbers.effects';
import { numberRow } from '@/modules/messaging/numbers/numbers.fakes';
import type { NumbersRepo } from '@/modules/messaging/numbers/numbers.repo';
import type { EvolutionNumbersRepo } from './evolution-numbers.repo';
import { NumbersEvolution } from './numbers-evolution';

// Owner 2026-11-06: an Evolution number's options saved (audited, config reloaded) and pushed with
// its OWN key; a restriction switches it off once and fails its queued rows.

const evo = numberRow({ provider: 'evolution', phone_number_id: 'secondary-1', evolution_mode: 'baileys' });

function setup(row = evo, secrets: Record<string, string> = { evolution_token: 'fake-instance-token' }) {
  const repo = { byId: vi.fn(async () => row) };
  const store = { read: vi.fn(async () => secrets) };
  const evolution = {
    saveConfig: vi.fn(async () => true), restrict: vi.fn(async () => true),
    failQueued: vi.fn(async () => 2),
    errorWindow: vi.fn(async (): Promise<{ trip: number; enabledAt: string } | null> =>
      ({ trip: 3, enabledAt: '2026-11-06T08:00:00Z' })),
    countErrors: vi.fn(async (_id: string, _since: Date) => 3),
  };
  const effects = { after: vi.fn(async () => undefined) };
  const svc = new NumbersEvolution(
    repo as unknown as NumbersRepo, store as unknown as NumbersSecrets,
    evolution as unknown as EvolutionNumbersRepo, effects as unknown as NumbersEffects,
  );
  return { svc, evolution, effects, store };
}

describe('NumbersEvolution', () => {
  afterEach(() => setIntegrationOverlay({}));

  it('the push uses the number OWN key; the global key is passed only to create the instance', async () => {
    setIntegrationOverlay({ EVOLUTION_API_BASE: 'https://evo.example.test', EVOLUTION_API_KEY: 'fake-global' });
    const input = await setup().svc.pushInput(evo.id);
    expect(input.env.token).toBe('fake-instance-token');
    expect(input.globalKey).toBe('fake-global');
    await expect(setup(evo, {}).svc.pushInput(evo.id)).rejects.toMatchObject({ response: { code: 'evolution_not_configured' } });
    await expect(setup(numberRow()).svc.pushInput(evo.id)).rejects.toMatchObject({ response: { code: 'not_evolution' } });
  });

  it('an http base to a host off the internal list is refused before any call', async () => {
    setIntegrationOverlay({ EVOLUTION_API_BASE: 'http://evo-other:8080' });
    await expect(setup().svc.instanceEnv(evo.id)).rejects.toMatchObject({ response: { code: 'evolution_not_configured' } });
  });

  it('the webhook URL is built by the server for the current instance, never taken from a body', async () => {
    setIntegrationOverlay({ EVOLUTION_API_BASE: 'https://evo.example.test' });
    const input = await setup().svc.pushInput(evo.id);
    expect(input.hookUrl).toBe('http://ayat-lb:8080/webhooks/evolution/secondary-1');
    const renamed = numberRow({ ...evo, phone_number_id: 'secondary-2' });
    expect((await setup(renamed).svc.pushInput(evo.id)).hookUrl).toContain('/webhooks/evolution/secondary-2');
  });

  it('a public origin without API_PUBLIC_URL, or a Cloud instance without its ids, is refused', async () => {
    const { svc, evolution } = setup();
    const pub = evolutionConfigSchema.parse({ webhook: { origin: 'public' } });
    vi.stubEnv('API_PUBLIC_URL', '');
    await expect(svc.saveConfig({ id: evo.id, config: pub, actorId: 'a1' }))
      .rejects.toMatchObject({ response: { code: 'webhook_origin' } });
    vi.unstubAllEnvs();
    const cloud = numberRow({ ...evo, evolution_mode: 'cloud' });
    const plain = evolutionConfigSchema.parse({});
    await expect(setup(cloud).svc.saveConfig({ id: evo.id, config: plain, actorId: 'a1' }))
      .rejects.toMatchObject({ response: { code: 'cloud_ids_needed' } });
    expect(evolution.saveConfig).not.toHaveBeenCalled();
    setIntegrationOverlay({ EVOLUTION_API_BASE: 'https://evo.example.test' });
    const token = { evolution_cloud_token: 'fake-meta' };
    await expect(setup(cloud, token).svc.pushInput(evo.id))
      .rejects.toMatchObject({ response: { code: 'evolution_cloud_ids' } });
  });

  it('N ERRORs within 15 min switch the number off, fail its queued rows, audited once', async () => {
    const { svc, evolution, effects } = setup();
    const now = new Date('2026-11-06T10:00:00Z');
    const at = { now, sentAt: '2026-11-06T09:59:00Z' };
    await expect(svc.tripOnErrors(evo.id, at)).resolves.toBe(true);
    expect(evolution.countErrors).toHaveBeenCalledWith(evo.id, new Date('2026-11-06T09:45:00Z'));
    expect(evolution.restrict).toHaveBeenCalledWith(evo.id, at);
    expect(evolution.failQueued).toHaveBeenCalledWith(evo.id);
    expect(effects.after).toHaveBeenCalledWith(expect.objectContaining({ action: 'evolution_restricted', actorId: null }));
    evolution.restrict.mockResolvedValueOnce(false);
    await expect(svc.tripOnErrors(evo.id, at)).resolves.toBe(false);
    expect(effects.after).toHaveBeenCalledTimes(1);
  });

  it('fewer ERRORs than the trip, or errors from before the last enable, switch nothing off', async () => {
    const { svc, evolution } = setup();
    const now = new Date('2026-11-06T10:00:00Z');
    const at = { now, sentAt: '2026-11-06T09:59:00Z' };
    evolution.countErrors.mockResolvedValueOnce(2);
    await expect(svc.tripOnErrors(evo.id, at)).resolves.toBe(false);
    evolution.errorWindow.mockResolvedValueOnce({ trip: 3, enabledAt: '2026-11-06T09:58:00Z' });
    await svc.tripOnErrors(evo.id, at);
    expect(evolution.countErrors).toHaveBeenLastCalledWith(evo.id, new Date('2026-11-06T09:58:00Z'));
    evolution.errorWindow.mockResolvedValueOnce(null);
    evolution.restrict.mockClear();
    await expect(svc.tripOnErrors(evo.id, at)).resolves.toBe(false);
    expect(evolution.restrict).not.toHaveBeenCalled();
  });
});
