import { shape, type } from '@/theme';
import { inputLine } from './ComposerInput';

// Owner 2026-11-01: on Android «Message» and the caret sat at the top of the typing bar.
// The pill's 44pt less its 1pt border, top and bottom.
const BOX = shape.control.touch - 2;
// Noto Sans Arabic's own line (hhea ascent 1374 + descent 738 per 1000): what Android gives the
// placeholder and an empty box's caret.
const FONT_LINE = Math.ceil((type.size.base * (1374 + 738)) / 1000);

test('android: no lineHeight, equal paddings, and the font’s own line fits the box', () => {
  const line = inputLine('android');
  expect(line.lineHeight).toBeUndefined();
  expect(BOX - 2 * line.paddingVertical).toBeGreaterThanOrEqual(FONT_LINE);
  expect(BOX - 2 * line.paddingVertical - FONT_LINE).toBeLessThan(2);
});

test('ios keeps the Arabic 26pt line between 8 + 8', () => {
  expect(inputLine('ios')).toEqual({ paddingVertical: 8, lineHeight: type.lineHeight(type.size.base) });
  expect(type.lineHeight(type.size.base) + 2 * 8).toBe(BOX);
});
