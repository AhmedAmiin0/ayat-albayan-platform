import type { MessageView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { replayedOther, type SentOriginal, sentRowOf } from './unconfirmed.js';

const AT = '2026-10-02T09:00:00.000Z';
const sent: SentOriginal = { body: 'وصلت', template_key: null, created_at: AT };
const row = (over: Partial<MessageView> = {}): MessageView =>
  ({
    id: 'srv-1',
    direction: 'outbound',
    body: 'وصلت',
    template_key: null,
    created_at: '2026-10-02T09:00:05Z',
    ...over,
  }) as MessageView;

describe('sentRowOf: the server row of an unconfirmed send', () => {
  it('ours, new since the send, the same ORIGINAL words', () => {
    const server = row();
    expect(sentRowOf([server], sent, new Set())).toBe(server);
  });

  it('a row held before, an inbound row or other words (an edit) is not it', () => {
    expect(sentRowOf([row()], sent, new Set(['srv-1']))).toBeUndefined();
    expect(sentRowOf([row({ direction: 'inbound' })], sent, new Set())).toBeUndefined();
    expect(sentRowOf([row({ body: 'وصلت الآن' })], sent, new Set())).toBeUndefined();
  });

  it("allows the client's clock 5 minutes ahead, not more", () => {
    const early = (min: number) =>
      row({ created_at: new Date(Date.parse(AT) - min * 60_000).toISOString() });
    expect(sentRowOf([early(4)], sent, new Set())).toBeDefined();
    expect(sentRowOf([early(6)], sent, new Set())).toBeUndefined();
  });

  it('a template matches by its key (the server renders its own body)', () => {
    const tpl = { body: 'عرض سعر', template_key: 'renewal_due', created_at: AT };
    const server = row({ template_key: 'renewal_due', body: 'نص القالب' });
    expect(sentRowOf([server], tpl, new Set())).toBe(server);
    expect(sentRowOf([row({ template_key: 'other' })], tpl, new Set())).toBeUndefined();
  });
});

it('a replay answered with another body is the first message, not the edit', () => {
  expect(replayedOther({ body: 'وصلت' }, 'وصلت الآن')).toBe(true);
  expect(replayedOther({ body: 'وصلت' }, 'وصلت')).toBe(false);
});
