import { ascii } from './ascii-digits';

test('Arabic-Indic digits become Western; text is trimmed; others are untouched', () => {
  expect(ascii(' ٢٠٢٦-١٠-٠٤ ')).toBe('2026-10-04');
  expect(ascii('12, 48')).toBe('12, 48');
  expect(ascii('   ')).toBe('');
});
