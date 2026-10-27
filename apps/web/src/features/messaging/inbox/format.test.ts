import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { clockText, errorText, fullTime, listTime, mediaKind, previewText, sessionUntil, threadKind, threadName, unreadLabel } from './format';
import { PHONE, thread } from './testing/inbox-fixture';
import { locale } from '@/lib/i18n/locale';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale } as const;

describe('inbox display text (docs/07 §9)', () => {
  it.each([
    ['image/jpeg', 'image'],
    ['audio/ogg; codecs=opus', 'audio'],
    ['video/mp4', 'video'],
    ['application/pdf', 'document'],
    [null, 'other'],
  ] as const)('media %s → %s', (mime, kind) => {
    expect(mediaKind(mime)).toBe(kind);
  });

  it('names a thread by its person, else by the grouped phone', () => {
    expect(threadName(thread())).toBe('أم سهيلة');
    expect(threadName(thread({ display_name: null }))).toBe('+966 50 123 4567');
    expect(threadName({ display_name: null, phone_e164: PHONE })).toContain('+966');
  });

  it('guardian and teacher win over the lead; nobody known is null', () => {
    expect(threadKind(thread({ guardian_id: 'g' }))).toBe('guardian');
    expect(threadKind(thread({ teacher_id: 't' }))).toBe('teacher');
    expect(threadKind(thread())).toBe('lead');
    expect(threadKind(thread({ lead_id: null }))).toBeNull();
  });

  it('preview: their text as is, ours after «أنت:», media and templates named', () => {
    expect(previewText(thread())).toBe('السلام عليكم');
    expect(previewText(thread({ last_direction: 'outbound', last_body: 'أهلًا' }))).toBe(`${t.inbox.you} أهلًا`);
    expect(previewText(thread({ last_media_mime: 'image/png', last_body: null }))).toBe(t.inbox.media.image);
    expect(previewText(thread({ last_media_mime: 'image/png', last_body: 'الواجب' }))).toBe(`${t.inbox.media.image}: الواجب`);
    expect(previewText(thread({ last_direction: 'outbound', last_body: null, last_template_key: 'renewal_due' }))).toBe(
      `${t.inbox.you} ${t.inbox.templateLine.replace('{name}', t.templates.names.renewal_due)}`,
    );
    expect(previewText(thread({ last_body: null }))).toBe(t.inbox.media.other);
  });

  it('preview: a last message whose content never arrived (Meta’s 131060) is «رسالة لم يصل محتواها»', () => {
    expect(previewText(thread({ last_body: null, last_unsupported: true }))).toBe(t.inbox.previewUnsupported);
  });

  it('unread counts use the Arabic forms', () => {
    expect(unreadLabel(1)).toBe(t.inbox.unread.one);
    expect(unreadLabel(2)).toBe(t.inbox.unread.two);
    expect(unreadLabel(3)).toBe('3 رسائل جديدة');
    expect(unreadLabel(11)).toBe('11 رسالة جديدة');
  });

  it('list time: the clock today, the date otherwise, Western digits', () => {
    const now = new Date('2026-10-01T15:00:00');
    expect(listTime(new Date('2026-10-01T09:05:00').toISOString(), C24, now)).toBe('09:05');
    expect(listTime(new Date('2026-09-28T09:05:00').toISOString(), C24, now)).toMatch(/^28 /);
  });

  it('12 h: ص / م in Arabic, AM / PM in English; midnight and noon read 12', () => {
    const now = new Date('2026-10-01T15:00:00');
    const at = (hhmm: string) => new Date(`2026-10-01T${hhmm}:00`).toISOString();
    expect(listTime(at('17:30'), { cycle: '12', locale: 'ar' }, now)).toBe('5:30 م');
    expect(listTime(at('09:05'), { cycle: '12', locale: 'en' }, now)).toBe('9:05 AM');
    expect(clockText(at('00:00'), { cycle: '12', locale: 'ar' })).toBe('12:00 ص');
    expect(clockText(at('12:00'), { cycle: '12', locale: 'en' })).toBe('12:00 PM');
    expect(clockText(at('17:30'), C24)).toBe('17:30');
    expect(fullTime(at('17:30'), { cycle: '12', locale: 'ar' })).toMatch(/2026، 5:30 م$/);
  });

  it('the session window closes 24 h after their last message', () => {
    expect(sessionUntil('2026-10-01T10:00:00Z', C24)).toMatch(/2026/);
    expect(sessionUntil('2026-10-01T10:00:00Z', C24)).not.toMatch(/[٠-٩]/);
  });

  it('errors: known Meta codes in words, anything else with its code', () => {
    expect(errorText({ error_code: '131047', error_text: null })).toBe(t.messages.errors['131047']);
    expect(errorText({ error_code: 'expired', error_text: null })).toBe(t.messages.errors.expired);
    expect(errorText({ error_code: '999', error_text: 'boom' })).toBe(t.messages.errors.unknown.replace('{code}', '999'));
    expect(errorText({ error_code: null, error_text: 'boom' })).toContain('boom');
  });
});
