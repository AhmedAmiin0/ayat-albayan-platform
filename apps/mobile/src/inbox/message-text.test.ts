import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import {
  errorLine,
  mediaKind,
  mediaLine,
  queuedLine,
  sendError,
  sessionUntil,
  stamp,
  templateLine,
} from './message-text';

const RIYADH = { now: new Date('2026-10-02T09:00:00Z'), tz: 'Asia/Riyadh' };

test.each([
  ['image/jpeg', 'image'],
  ['image/webp', 'sticker'],
  ['audio/ogg; codecs=opus', 'audio'],
  ['video/mp4', 'video'],
  ['application/pdf', 'document'],
  ['text/vcard', 'document'],
  ['model/gltf', 'other'],
  [null, 'other'],
])('mediaKind(%s) → %s', (mime, kind) => {
  expect(mediaKind(mime)).toBe(kind);
});

test('media line: the file kind, «مش مدعومة» with neither file nor text, nothing for plain text', () => {
  expect(mediaLine({ body: 'شوفي', media_mime: 'image/png' })).toBe(t.inbox.media.image);
  expect(mediaLine({ body: null, media_mime: null })).toBe(t.inbox.media.other);
  expect(mediaLine({ body: 'السلام عليكم', media_mime: null })).toBeNull();
});

test('template line uses the registry name; an unknown key shows as itself', () => {
  expect(templateLine('renewal_due')).toBe(
    t.inbox.templateLine.replace('{name}', t.templates.names.renewal_due),
  );
  expect(templateLine('crm_old')).toBe(t.inbox.templateLine.replace('{name}', 'crm_old'));
});

test('stamp: the clock today, day/month + clock another day, in the given zone', () => {
  expect(stamp('2026-10-02T08:05:00Z', RIYADH)).toBe('11:05');
  expect(stamp('2026-09-30T20:30:00Z', RIYADH)).toBe('30/9 23:30');
  // 22:30 UTC on the 1st is already the 2nd in Riyadh.
  expect(stamp('2026-10-01T22:30:00Z', RIYADH)).toBe('01:30');
});

test('the session hint ends 24 h after their last message', () => {
  expect(sessionUntil('2026-10-02T08:00:00Z', RIYADH)).toBe(
    t.inbox.sessionOpenUntil.replace('{time}', '3/10 11:00'),
  );
});

test('queued line only for a row scheduled later', () => {
  const later = { status: 'queued' as const, scheduled_for: '2026-10-02T12:00:00Z' };
  expect(queuedLine(later, RIYADH)).toBe(t.messages.queuedFor.replace('{time}', '15:00'));
  expect(queuedLine({ ...later, scheduled_for: '2026-10-02T08:00:00Z' }, RIYADH)).toBeNull();
  expect(queuedLine({ ...later, scheduled_for: null }, RIYADH)).toBeNull();
  expect(queuedLine({ ...later, status: 'sent' }, RIYADH)).toBeNull();
});

test('error line: Meta code in Arabic, else the unknown line with the code', () => {
  const reason = (r: string) => t.messages.errorLine.replace('{reason}', r);
  expect(errorLine({ error_code: '131026' })).toBe(reason(t.messages.errors['131026']));
  expect(errorLine({ error_code: 'expired' })).toBe(
    reason(t.messages.errors.unknown.replace('{code}', 'expired')),
  );
  expect(errorLine({ error_code: 'unknown' })).toBe(
    reason(t.messages.errors.unknown.replace('{code}', 'unknown')),
  );
  expect(errorLine({ error_code: null })).toBe(
    reason(t.messages.errors.unknown.replace('{code}', '—')),
  );
});

test('send errors: the API code in Arabic, anything else «الرسالة متبعتتش»', () => {
  for (const code of ['session_closed', 'template_not_approved', 'invalid_phone'] as const) {
    expect(sendError(new ApiError(409, { code }))).toBe(t.inbox.error[code]);
  }
  expect(sendError(new ApiError(409, { code: 'other' }))).toBe(t.inbox.error.send_failed);
  expect(sendError(new ApiError(500))).toBe(t.inbox.error.send_failed);
  expect(sendError(new Error('offline'))).toBe(t.inbox.error.send_failed);
});
