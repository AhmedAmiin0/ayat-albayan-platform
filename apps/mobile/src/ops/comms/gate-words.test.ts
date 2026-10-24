import { t } from '@/lib/i18n';
import { gateChip, gateLines } from './gate-words';

const s = t.templates.settings;

test('open: «الإرسال يعمل» and the empty queue', () => {
  const gate = { open: true, reason: null, queued: 0 } as const;
  expect(gateChip(gate)).toEqual({ tone: 'ok', glyph: 'fill', label: s.on });
  expect(gateLines(gate)).toEqual([s.queued.zero]);
});

test('the admin switch off: why, and how many wait', () => {
  const gate = { open: false, reason: 'switch_off', queued: 3 } as const;
  expect(gateChip(gate)).toEqual({ tone: 'neutral', glyph: 'struck', label: s.off });
  expect(gateLines(gate)).toEqual([t.inbox.messagingOff, s.queued.few.replace('{n}', '3')]);
});

test('WhatsApp not set up, and the allow-list restricting sends', () => {
  const lines = gateLines({ open: false, reason: 'not_configured', queued: 1, restricted: true });
  expect(lines).toEqual([t.inbox.messagingOffServer, s.queued.one, s.recipientsRestricted]);
});
