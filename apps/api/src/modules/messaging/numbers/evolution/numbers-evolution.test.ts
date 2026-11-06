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
  };
  const effects = { after: vi.fn(async () => undefined) };
  const svc = new NumbersEvolution(
    repo as unknown as NumbersRepo, store as unknown as NumbersSecrets,
    evolution as unknown as EvolutionNumbersRepo, effects as unknown as NumbersEffects,
  );
  return { svc, evolution, effects };
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

  it('a webhook URL off our route for this instance is refused before anything is saved', async () => {
    const { svc, evolution } = setup();
    const config = evolutionConfigSchema.parse({ webhook: { url: 'https://evil.example.test/x' } });
    await expect(svc.saveConfig({ id: evo.id, config, actorId: 'a1' }))
      .rejects.toMatchObject({ response: { code: 'webhook_url' } });
    expect(evolution.saveConfig).not.toHaveBeenCalled();
  });

  it('a restriction switches the number off, fails its queued rows and is audited once', async () => {
    const { svc, evolution, effects } = setup();
    const now = new Date('2026-11-06T10:00:00Z');
    await expect(svc.restrict(evo.id, { now, sentAt: '2026-11-06T09:59:00Z' })).resolves.toBe(true);
    expect(evolution.failQueued).toHaveBeenCalledWith(evo.id);
    expect(effects.after).toHaveBeenCalledWith(expect.objectContaining({ action: 'evolution_restricted', actorId: null }));
    evolution.restrict.mockResolvedValueOnce(false);
    await expect(svc.restrict(evo.id, { now, sentAt: '2026-11-06T09:59:00Z' })).resolves.toBe(false);
    expect(effects.after).toHaveBeenCalledTimes(1);
  });
});
