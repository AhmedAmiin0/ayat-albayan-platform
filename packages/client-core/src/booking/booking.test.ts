import { describe, expect, it } from 'vitest';
import { bookingInvoiceInput, bookingPicks, bookingPicksFrom } from '../index.js';

const A = '2026-10-04T14:00:00Z';
const B = '2026-10-06T16:00:00Z';
const C = '2026-10-08T15:30:00Z';

describe('booking picks', () => {
  it('lists every pick, earliest first; none without a first slot', () => {
    expect(bookingPicks({ startsAt: A, extra: [B, C] })).toEqual([A, B, C]);
    expect(bookingPicks({ startsAt: null, extra: [B] })).toEqual([]);
  });

  it('puts the earliest pick back as startsAt, the rest sorted', () => {
    expect(bookingPicksFrom([C, A, B])).toEqual({ startsAt: A, extra: [B, C] });
    expect(bookingPicksFrom([])).toEqual({ startsAt: null, extra: [] });
  });
});

describe('booking invoice', () => {
  it('sends only the API fields of an upload or a chat message', () => {
    const upload = { source: 'upload' as const, path: 'inv/1.pdf', name: 'a.pdf', mime: 'application/pdf', preview: null };
    expect(bookingInvoiceInput(upload)).toEqual({ source: 'upload', path: 'inv/1.pdf' });
    const chat = { source: 'whatsapp' as const, messageId: 'm1', mime: 'image/jpeg', uri: 'file://x' };
    expect(bookingInvoiceInput(chat)).toEqual({ source: 'whatsapp', messageId: 'm1' });
  });
});
