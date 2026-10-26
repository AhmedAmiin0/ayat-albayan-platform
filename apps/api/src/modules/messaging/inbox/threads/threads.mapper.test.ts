import { describe, expect, it } from 'vitest';
import { toTemplateView } from '../../whatsapp/templates/catalog/template.mapper';
import { REMINDER_24H, templateRow } from '../../whatsapp/whatsapp.fakes';
import { threadRow } from '../inbox.fakes';
import { missingParams, threadSearchFilter, toThreadView } from './threads.mapper';

const AT = new Date('2026-10-02T08:00:00Z');
const hours = (h: number) => new Date(AT.getTime() + h * 3_600_000);

describe('toThreadView (H1/H2)', () => {
  it('session_open while the last inbound is under 24 h old (R-MSG-03)', () => {
    expect(toThreadView(threadRow(), hours(23.9)).session_open).toBe(true);
    expect(toThreadView(threadRow(), hours(24)).session_open).toBe(false);
    expect(toThreadView(threadRow({ last_inbound_at: null }), AT).session_open).toBe(false);
  });

  it('fills the view’s nullable columns with safe values', () => {
    const v = toThreadView(threadRow({ unread_count: null, display_name: null }), AT);
    expect([v.unread_count, v.display_name, v.phone_e164]).toEqual([0, null, '+966501234567']);
  });

  it('passes last_inbound_line through; the 24 h window ignores the line (docs/12 §13.7)', () => {
    expect(toThreadView(threadRow({ last_inbound_line: null }), AT).last_inbound_line).toBeNull();
    const chat = toThreadView(threadRow({ last_inbound_line: 'chat' }), hours(23.9));
    expect([chat.last_inbound_line, chat.session_open]).toEqual(['chat', true]);
    expect(toThreadView(threadRow({ last_inbound_line: 'chat' }), hours(24)).session_open).toBe(false);
    expect(toThreadView(threadRow({ last_inbound_line: 'notifications' }), AT).last_inbound_line).toBe('notifications');
  });
});

describe('threadSearchFilter', () => {
  it('a phone in any format → its digits; otherwise the display name', () => {
    expect(threadSearchFilter('0501234567')).toBe('phone_e164.ilike.*501234567*'); // any country code
    expect(threadSearchFilter('+966 50 123 4567')).toBe('phone_e164.ilike.*966501234567*');
    expect(threadSearchFilter('٥٦٦١٠')).toBe('phone_e164.ilike.*56610*');
    expect(threadSearchFilter('٠٥٦ 610')).toBe('phone_e164.ilike.*56610*');
    expect(threadSearchFilter('ياسمين')).toBe('display_name.ilike.*ياسمين*');
    expect(threadSearchFilter('(),')).toBeNull();
  });
});

describe('missingParams (H4)', () => {
  const jitsi = toTemplateView(templateRow()); // booking_confirmation: {{1}}, {{2}}, URL {{1}}

  it('every {{n}} and the meeting code of a URL button are required', () => {
    expect(missingParams(jitsi, {})).toEqual(['1', '2', 'button']);
    expect(missingParams(jitsi, { '1': 'ياسمين', '2': 'الأحد 16:00', button: 'room' })).toEqual([]);
  });

  it('quick-reply buttons need nothing from the admin', () => {
    expect(missingParams(toTemplateView(REMINDER_24H), { '1': 'ياسمين', '2': '17:00' })).toEqual([]);
  });
});
