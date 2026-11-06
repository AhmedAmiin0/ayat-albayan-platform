import { afterEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import type { EvolutionLineEnv } from '@/config/env/env';
import { threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import type { ThreadWindow } from './send-number';
import { CHAT_DEFAULT } from './send-number.fakes';
import { sendLine, textLine } from './text-line';

// docs/19 «Evolution driver»: an Evolution BAILEYS chat number has no 24 h window, so a closed
// window neither refuses (409) nor holds (awaiting_reply) a staff send; Cloud keeps Meta's rule.

const NOW = new Date('2026-11-06T10:00:00Z');
const old = new Date(NOW.getTime() - 30 * 3_600_000).toISOString();
const closed = threadRow({ last_inbound_at: old, last_notifications_inbound_at: old });
const noWindows = async (): Promise<ThreadWindow[]> => [];
const at = { now: NOW, windows: noWindows };

const evo = (mode: EvolutionLineEnv['mode']): EvolutionLineEnv => ({
  provider: 'evolution', base: 'https://evo.example.test', instance: 'secondary-1',
  token: 'fake-instance-token', mode, autoSends: false, gapMs: 3_000,
});

function chatOnEvolution(mode: EvolutionLineEnv['mode']): void {
  vi.stubEnv('EVOLUTION_API_BASE', 'https://evo.example.test');
  const number = { ...CHAT_DEFAULT, id: 'num-evo', phone_number_id: 'secondary-1', env: evo(mode) };
  const values = { WA_CHAT_PROVIDER: 'evolution', WA_CHAT_PHONE_NUMBER_ID: 'secondary-1' };
  setNumbersOverlay({ values, numberIds: { chat: 'num-evo' }, numbers: [number] });
}

const code = (e: unknown) => (e as { getResponse(): { code: string } }).getResponse().code;

afterEach(() => {
  setNumbersOverlay(null);
  vi.unstubAllEnvs();
});

describe('the 24 h window on an Evolution chat number', () => {
  it('Baileys: a closed window sends free text from the chat number, never held', async () => {
    chatOnEvolution('baileys');
    expect(await textLine(closed, at)).toEqual({ line: 'chat', number_id: 'num-evo' });
  });

  it('Baileys: teacher mode (sendLine) is not refused either', async () => {
    chatOnEvolution('baileys');
    expect(await sendLine(closed, at)).toEqual({ line: 'chat', number_id: 'num-evo' });
  });

  it('Baileys: a phone that never wrote (no thread) still has nothing to answer: 409', async () => {
    chatOnEvolution('baileys');
    expect(code(await textLine(null, at).catch((x: unknown) => x))).toBe('session_closed');
  });

  it('Cloud: Meta rules: a closed window is 409 session_closed, no reopen hold', async () => {
    chatOnEvolution('cloud');
    expect(code(await textLine(closed, at).catch((x: unknown) => x))).toBe('session_closed');
    expect(code(await sendLine(closed, at).catch((x: unknown) => x))).toBe('session_closed');
  });
});
