import { t } from '@/lib/i18n';
import { GATE_LINE_SEPARATOR, gateChip, gateLine } from './gate-words';

const s = t.templates.settings;

test('open: «الإرسال يعمل» and the empty queue', () => {
  const gate = { open: true, reason: null, queued: 0 } as const;
  expect(gateChip(gate)).toEqual({ tone: 'ok', glyph: 'fill', label: s.on });
  expect(gateLine(gate)).toBe(s.queued.zero);
});

test('open under the allow-list: the web chip words «يعمل للأرقام المسموح بها فقط», never a plain «يعمل»', () => {
  const gate = { open: true, reason: null, queued: 2, restricted: true } as const;
  expect(gateChip(gate)).toEqual({ tone: 'ok', glyph: 'half', label: s.onRestricted });
  expect(gateChip(gate).label).not.toBe(s.on);
  expect(gateLine(gate)).toBe(s.queued.two);
});

test('the admin switch off: why, and how many wait, in one line', () => {
  const gate = { open: false, reason: 'switch_off', queued: 3 } as const;
  expect(gateChip(gate)).toEqual({ tone: 'neutral', glyph: 'struck', label: s.off });
  expect(gateLine(gate)).toBe(`${t.inbox.messagingOff}${GATE_LINE_SEPARATOR}${s.queued.few.replace('{n}', '3')}`);
});

test('WhatsApp not set up: closed even under the allow-list, with the server reason', () => {
  const gate = { open: false, reason: 'not_configured', queued: 1, restricted: true } as const;
  expect(gateChip(gate).label).toBe(s.off);
  expect(gateLine(gate)).toBe(`${t.inbox.messagingOffServer}${GATE_LINE_SEPARATOR}${s.queued.one}`);
});
