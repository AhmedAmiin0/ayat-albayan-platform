import { describe, expect, it } from 'vitest';
import type { CrmMessage } from '@/modules/messaging/whatsapp';
import { PHONE, uncertainRow } from './crm-confirm.fakes';
import { matchUncertain, type UncertainRow } from '@/modules/messaging/webhook/crm-confirm/crm-match';

// docs/19 «Confirming an uncertain send»: which ONE timed-out row the CRM's message is.

const SENT = new Date('2026-11-15T20:27:18Z');
const NAMES = new Map([['booking_confirmation', ['booking_confirmation']]]);

const item = (over: Partial<CrmMessage> = {}): CrmMessage => ({
  id: 'cm-1',
  conversation_id: 'c-1',
  direction: 'outbound',
  content_text: null,
  template_name: 'booking_confirmation',
  whatsapp_message_id: 'wamid.crm-1',
  status: 'delivered',
  created_at: SENT,
  ...over,
});

const match = (rows: UncertainRow[], over: { item?: CrmMessage; phone?: string; held?: boolean }) =>
  matchUncertain(rows, { item: item(), phone: PHONE, held: false, ...over }, NAMES);

describe('matchUncertain', () => {
  it('exactly one row: same phone, template name, window', () => {
    const one = uncertainRow();
    expect(match([one, uncertainRow({ id: 'm2', phone_e164: '+201000000002' })], {})).toEqual({
      row: one,
      count: 1,
    });
  });

  it('two look-alikes: none (left uncertain); zero: none', () => {
    expect(match([uncertainRow(), uncertainRow({ id: 'm2' })], {})).toEqual({
      row: null,
      count: 2,
    });
    expect(match([], {})).toEqual({ row: null, count: 0 });
  });

  it('the CRM phone without + normalises to the same E.164', () => {
    expect(match([uncertainRow()], { phone: '201000000001' }).row?.id).toBe('m1');
    expect(match([uncertainRow()], { phone: '201000000009' }).row).toBeNull();
  });

  it('a text row by its folded body; never a template row by text', () => {
    const text = uncertainRow({ template_key: null, body: 'موعد الحلقة\n غدًا' });
    const said = item({ template_name: null, content_text: 'موعد الحلقة غدًا ' });
    expect(match([text], { item: said }).row?.id).toBe('m1');
    expect(
      match([text], { item: item({ template_name: null, content_text: 'آخر' }) }).row,
    ).toBeNull();
    expect(match([uncertainRow()], { item: said }).row).toBeNull();
    expect(match([text], {}).row).toBeNull();
  });

  it('another template name: none', () => {
    expect(match([uncertainRow()], { item: item({ template_name: 'other' }) }).row).toBeNull();
  });

  it('outside [sent - 10 min, sent + 1 min]: none', () => {
    const early = uncertainRow({ created_at: '2026-11-15T20:17:17.000Z' });
    const late = uncertainRow({ created_at: '2026-11-15T20:28:19.000Z' });
    const edge = uncertainRow({ created_at: '2026-11-15T20:17:18.000Z' });
    expect(match([early], {}).row).toBeNull();
    expect(match([late], {}).row).toBeNull();
    expect(match([edge], {}).row?.id).toBe('m1');
  });

  it('a wamid a row already holds, an inbound message or none at all: none', () => {
    expect(match([uncertainRow()], { held: true }).row).toBeNull();
    expect(match([uncertainRow()], { item: item({ direction: 'inbound' }) }).row).toBeNull();
    expect(match([uncertainRow()], { item: item({ whatsapp_message_id: null }) }).row).toBeNull();
  });
});
