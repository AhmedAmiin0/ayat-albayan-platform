import { describe, expect, it } from 'vitest';
import { canCorrect, correctionBody, correctionsOf, isCorrectable, mayCorrect } from './correction.js';

const sent = {
  direction: 'outbound',
  status: 'delivered',
  body: 'الحلقة الساعة الرابعة',
  media_mime: null,
  template_key: null,
  interactive_payload: null,
  replyable: true,
  sent_by_id: 'u1',
};

describe('isCorrectable: an outbound, sent staff text WhatsApp knows', () => {
  it('a sent text is', () => expect(isCorrectable(sent)).toBe(true));

  it.each([
    ['inbound', { direction: 'inbound' }],
    ['failed', { status: 'failed' }],
    ['a template', { template_key: 'lesson_reminder' }],
    ['a file', { media_mime: 'image/jpeg' }],
    ['a marker', { interactive_payload: { type: 'reaction' } }],
    ['empty', { body: '  ' }],
    ['not known to WhatsApp yet', { replyable: false }],
    ['hidden', { hidden: { by_name: null, at: 'x' } }],
    ['deleted', { deleted: true }],
    ['a correction (staff correct the original again)', { corrects_id: 'o1' }],
  ])('%s is not', (_, over) => expect(isCorrectable({ ...sent, ...over })).toBe(false));
});

describe('mayCorrect / canCorrect: the author or an admin', () => {
  it('the author and an admin may; another, or a staff-less row, may not', () => {
    expect(mayCorrect('u1', { id: 'u1', role: 'sales' })).toBe(true);
    expect(mayCorrect('u2', { id: 'u1', role: 'admin' })).toBe(true);
    expect(mayCorrect('u2', { id: 'u1', role: 'sales' })).toBe(false);
    expect(mayCorrect(null, { id: 'u1', role: 'sales' })).toBe(false);
  });

  it('needs a viewer and a correctable message', () => {
    expect(canCorrect(sent, { id: 'u1' })).toBe(true);
    expect(canCorrect(sent, null)).toBe(false);
    expect(canCorrect({ ...sent, template_key: 'x' }, { id: 'u1', role: 'admin' })).toBe(false);
  });
});

describe('correctionBody / correctionsOf', () => {
  it('prefixes the trimmed text', () => {
    expect(correctionBody('تصحيح: ', '  نص جديد ')).toBe('تصحيح: نص جديد');
  });

  it('maps each original to its newest correction', () => {
    const rows = [
      { id: 'c2', created_at: '2026-11-07T09:00:00Z', corrects_id: 'o1' },
      { id: 'o1', created_at: '2026-11-07T07:00:00Z', corrects_id: null },
      { id: 'c1', created_at: '2026-11-07T08:00:00Z', corrects_id: 'o1' },
    ];
    expect([...correctionsOf(rows)]).toEqual([['o1', 'c2']]);
  });
});
