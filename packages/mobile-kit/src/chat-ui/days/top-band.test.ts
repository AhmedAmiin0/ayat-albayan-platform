import { CHIP_MARGIN, cellTop, chipCovered, FLOAT_TOP, type BandInput } from './top-band';

// The floating day never over an inline separator (owner 2026-10-27, as WhatsApp): geometry only.
const CHIP = 20;
const BAND = FLOAT_TOP + CHIP_MARGIN + CHIP + 4; // 34: the inline chip's top must be under it
const view = { offset: 0, length: 300 };
// One separated row, its frame chosen so its chip's top is `top` pt under the list's visual top.
const at = (top: number, label = 'الأحد'): BandInput => ({
  frames: new Map([['m1', { y: view.length - top - 100 + CHIP_MARGIN, height: 100 }]]),
  seps: [{ key: 'm1', label, inset: CHIP_MARGIN }],
  view,
  chip: CHIP,
  label: 'الأربعاء',
});

test('cellTop: the inverted cell’s far end, measured down from the visual top', () => {
  expect(cellTop({ y: 100, height: 50 }, { offset: 0, length: 300 })).toBe(150);
  expect(cellTop({ y: 100, height: 50 }, { offset: 40, length: 300 })).toBe(190);
});

test('a separator in the top band hides the floating chip; under the band it shows', () => {
  expect(chipCovered(at(0))).toBe(true);
  expect(chipCovered(at(BAND - 1))).toBe(true);
  expect(chipCovered(at(BAND))).toBe(false);
  expect(chipCovered(at(200))).toBe(false);
});

test('half scrolled past the top still covers; wholly past, the floating chip is back', () => {
  expect(chipCovered(at(-CHIP + 1))).toBe(true);
  expect(chipCovered(at(-CHIP))).toBe(false);
  expect(chipCovered(at(-500))).toBe(false);
});

test('never two chips with the same label: its own day’s separator on screen hides it', () => {
  expect(chipCovered(at(200, 'الأربعاء'))).toBe(true);
  expect(chipCovered(at(view.length, 'الأربعاء'))).toBe(false); // below the screen
  expect(chipCovered(at(-CHIP, 'الأربعاء'))).toBe(false); // above the screen
});

test('a row with no frame yet counts as off screen', () => {
  expect(chipCovered({ ...at(0), frames: new Map() })).toBe(false);
  expect(chipCovered({ ...at(0), seps: [] })).toBe(false);
});
