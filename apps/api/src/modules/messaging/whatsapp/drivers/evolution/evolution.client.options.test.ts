import { describe, expect, it } from 'vitest';
import { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { EvolutionWhatsappClient } from './evolution.client';
import { EvolutionPacer } from './evolution-pacer';
import { EVO_BAILEYS, EVO_CLOUD, evoSent } from './evolution.fakes';

// Owner 2026-11-06: the number's own sending options (typing delay, link preview) ride on each
// send, and the Baileys pace is asked, never slept on (docs/19 «Evolution driver»).

const TO = '+966500000001';

function setup(env = EVO_BAILEYS) {
  let t = 0;
  const pacer = new EvolutionPacer({ now: () => t });
  const f = scriptedFetch(evoSent('a'), evoSent('b'));
  const client = new EvolutionWhatsappClient(env, { fetch: f.fetch, timeoutMs: 1_000, pacer });
  return { f, client, move: (ms: number) => (t += ms) };
}

describe('EvolutionWhatsappClient — sending options and pace', () => {
  it('adds delay to every send and linkPreview to a text only', async () => {
    const { f, client } = setup({ ...EVO_BAILEYS, delayMs: 1_200, linkPreview: true });
    await client.sendText({ to: TO, text: 'https://example.test' });
    await client.sendDocument({ to: TO, kind: 'image', url: 'https://files.example.test/x' });
    expect(f.requests[0]?.body).toMatchObject({ delay: 1_200, linkPreview: true });
    expect(f.requests[1]?.body).toMatchObject({ delay: 1_200 });
    expect(f.requests[1]?.body).not.toHaveProperty('linkPreview');
  });

  it('answers the wait after a send to another recipient, and the daily cap', async () => {
    const { client, move } = setup();
    expect(client.pace(TO)).toEqual({ waitMs: 0, dailyCap: 60, gapMs: 3_000 });
    await client.sendText({ to: TO, text: 'أ' });
    expect(client.pace(TO)?.waitMs).toBe(0);
    expect(client.pace('+966500000002')?.waitMs).toBe(3_000);
    move(3_000);
    expect(client.pace('+966500000002')?.waitMs).toBe(0);
  });

  it('a Cloud instance is not paced (Meta keeps its own limits)', () => {
    expect(setup(EVO_CLOUD).client.pace(TO)).toBeNull();
  });
});
