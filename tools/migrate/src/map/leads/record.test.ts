import { describe, expect, it } from 'vitest';
import { message } from './fixtures.ts';
import { lastMessageTimes, leadStatus, sheetLeadRecord } from './record.ts';

describe('leadStatus', () => {
  it('takes a CRM status tag first', () => {
    expect(leadStatus(['مش مهتم', 'whatsapp'], 'trial_booked')).toBe('lost');
    expect(leadStatus(['جديد', 'مشترك'], undefined)).toBe('converted');
  });
  it('lets the sheet status win over «جديد» and no tag', () => {
    expect(leadStatus(['جديد'], 'trial_booked')).toBe('trial_booked');
    expect(leadStatus(['imported'], 'no_reply')).toBe('no_reply');
  });
  it("defaults to 'new' (never 'job_applicant')", () => {
    expect(leadStatus([], undefined)).toBe('new');
    expect(leadStatus(['جديد'], 'job_applicant')).toBe('new');
  });
});

describe('lastMessageTimes', () => {
  it('splits customer (in) from agent/bot (out)', () => {
    const at = (h: number) => `2026-09-12T${String(h).padStart(2, '0')}:00:00+00:00`;
    const times = lastMessageTimes([
      message({ id: 'a', conv: 'c', sender: 'customer', at: at(11) }),
      message({ id: 'b', conv: 'c', sender: 'customer', at: at(9) }),
      message({ id: 'c', conv: 'c', sender: 'bot', at: at(10) }),
    ]);
    expect(times).toEqual({ last_inbound_at: at(11), last_outbound_at: at(10) });
    expect(lastMessageTimes([])).toEqual({ last_inbound_at: null, last_outbound_at: null });
  });
});

describe('sheetLeadRecord', () => {
  it('turns the Riyadh day into a UTC instant and keeps the summary', () => {
    const r = sheetLeadRecord({
      ref: { source: 'HUB', tab: 'كل المحادثات', row: 2 },
      phone: { e164: '+966551110001', tz: 'Asia/Riyadh' },
      name: 'سارة',
      status: 'interested_no_slot',
      source: undefined,
      summary: 'تسأل عن المواعيد',
      agreedSlot: null,
      date: '2026-09-03',
    });
    expect(r.columns).toEqual({
      phone_e164: '+966551110001',
      source: 'whatsapp_direct',
      tz: 'Asia/Riyadh',
      name: 'سارة',
      status: 'interested_no_slot',
      qualification: { legacy_summary: 'تسأل عن المواعيد' },
      created_at: '2026-09-02T21:00:00.000Z',
    });
    expect(r.refs).toEqual({});
  });
});
