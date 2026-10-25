import { formatPhone } from '@ab/shared';
import { t } from '@/lib/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { checkedLine, healthChip, numberSubtitle, parityLine, sourceLine, stateChips } from './numbers-words';
import { numbers, parityDiff, parityOk } from './numbers-fixtures';

const n = t.numbers;
const [main, chat] = numbers;
if (!main || !chat) throw new Error('fixture needs two numbers');

test('source and parity lines', () => {
  expect(sourceLine(parityOk)).toBe(n.source.current.replace('{{source}}', n.source.legacy));
  expect(sourceLine(parityDiff)).toBe(n.source.current.replace('{{source}}', n.source.module));
  expect(parityLine(parityOk)).toBe(n.mobile.parityOk);
  expect(parityLine(parityDiff)).toBe(n.mobile.parityDiff.replace('{{count}}', '2'));
});

test('subtitle isolates the phone, or says not checked', () => {
  expect(numberSubtitle(main)).toBe(`${n.purpose.notifications} · ${ltr(formatPhone('+15550001111'))}`);
  expect(numberSubtitle(chat)).toBe(`${n.purpose.chat} · ${n.chips.notChecked}`);
});

test('a checked number with no phone (its last check failed) never says «not checked yet»', () => {
  expect(numberSubtitle({ ...chat, checked_at: '2026-10-22T08:00:00Z' })).toBe(n.purpose.chat);
});

test('state chips: enabled + default, or disabled alone', () => {
  expect(stateChips(main).map((c) => c.label)).toEqual([n.chips.enabled, n.chips.default]);
  expect(stateChips(chat)).toEqual([{ tone: 'neutral', glyph: 'struck', label: n.chips.disabled }]);
});

test('health chip and last check', () => {
  expect(healthChip(main)?.label).toBe(n.health.ok);
  expect(healthChip(chat)).toBeNull();
  expect(healthChip({ health: { ok: false, status: null, quality_rating: null, verified_name: null, gaps: [], errors: 1 } }))
    .toEqual({ tone: 'bad', glyph: 'struck', label: n.health.failed });
  expect(checkedLine(main)).toMatch(/2026/);
  expect(checkedLine(chat)).toBeNull();
});
