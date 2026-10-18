import { describe, expect, it } from 'vitest';
import { MESSAGE_STATUSES } from '../enums/index.js';
import { messageTicks, TICK_PATHS, tickHasWord, tickTone } from './ticks.js';

describe('messageTicks (WhatsApp-style delivery ticks)', () => {
  it.each([
    ['queued', 'pending', 'muted'],
    ['sent', 'sent', 'muted'],
    ['delivered', 'delivered', 'muted'],
    ['read', 'read', 'read'],
    ['failed', 'failed', 'bad'],
    ['sent_manually', 'manual', 'muted'],
  ] as const)('%s → %s ticks in the %s ink', (status, kind, tone) => {
    expect(messageTicks(status)).toBe(kind);
    expect(tickTone(kind)).toBe(tone);
  });

  it('covers every message status', () => {
    for (const s of MESSAGE_STATUSES) expect(TICK_PATHS[messageTicks(s)]).toMatch(/^[mM]/);
  });

  it('delivered, read and manual draw two ticks; sent one', () => {
    expect(TICK_PATHS.delivered).toBe(TICK_PATHS.read);
    expect(TICK_PATHS.manual).toBe(TICK_PATHS.read);
    expect(TICK_PATHS.sent).not.toBe(TICK_PATHS.read);
  });

  it('only a manual send keeps its word', () => {
    expect(MESSAGE_STATUSES.filter((s) => tickHasWord(messageTicks(s)))).toEqual(['sent_manually']);
  });
});
