import { describe, expect, it } from 'vitest';
import { MESSAGE_STATUSES } from '@ab/catalog';
import { messageStatusStyle } from './status-style';
import {
  bubbleWord,
  messageTicks,
  sendUnconfirmed,
  TICK_PATHS,
  tickTone,
  tickWord,
} from './ticks';

describe('messageTicks (WhatsApp-style delivery ticks)', () => {
  it.each([
    ['queued', 'pending', 'muted'],
    ['sent', 'sent', 'muted'],
    ['delivered', 'delivered', 'muted'],
    ['read', 'read', 'read'],
    ['failed', 'failed', 'act'],
    ['sent_manually', 'manual', 'muted'],
  ] as const)('%s → %s ticks in the %s ink', (status, kind, tone) => {
    expect(messageTicks(status)).toBe(kind);
    expect(tickTone(kind)).toBe(tone);
  });

  it('failed shares the «دورك» tone of its status chip', () => {
    expect(tickTone(messageTicks('failed'))).toBe(messageStatusStyle.failed.tone);
  });

  it('covers every message status', () => {
    for (const s of MESSAGE_STATUSES) expect(TICK_PATHS[messageTicks(s)]).toMatch(/^[mM]/);
  });

  it('delivered, read and manual draw two ticks; sent one', () => {
    expect(TICK_PATHS.delivered).toBe(TICK_PATHS.read);
    expect(TICK_PATHS.manual).toBe(TICK_PATHS.read);
    expect(TICK_PATHS.sent).not.toBe(TICK_PATHS.read);
  });

  it('failed and a manual send carry a word, failed not in a thread row (its own word says it)', () => {
    expect(MESSAGE_STATUSES.filter((s) => tickWord(messageTicks(s)))).toEqual(['failed', 'sent_manually']);
    expect(tickWord('failed', true)).toBeNull();
    expect(tickWord('manual', true)).toBe('manual');
  });

  it('a failed send that may have gone reads unconfirmed, never «لم تُرسل» (docs/19)', () => {
    expect(bubbleWord('failed', 'uncertain')).toBe('unconfirmed');
    expect(bubbleWord('failed', 'crm_uncertain')).toBe('unconfirmed');
    expect(bubbleWord('failed', '131026')).toBe('failed');
    expect(bubbleWord('failed', null)).toBe('failed');
    expect(bubbleWord('failed', 'uncertain', true)).toBeNull();
    expect(bubbleWord('sent', 'uncertain')).toBeNull();
    expect(bubbleWord('sent_manually')).toBe('manual');
    expect(sendUnconfirmed('queued', 'uncertain')).toBe(false);
    expect(tickTone(messageTicks('failed'))).toBe('act');
  });
});
