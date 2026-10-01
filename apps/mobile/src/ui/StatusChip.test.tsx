import { leadStatusStyle, lessonStatusStyle, type Tone } from '@ab/shared';
import { render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { palette } from '@/theme';
import { StatusChip, toneColors } from './StatusChip';

const hidden = { includeHiddenElements: true };

test('glyph + ar.json word: shape carries the state, not colour alone', async () => {
  await render(<StatusChip {...leadStatusStyle.new} label={t.enums.leadStatus.new} />);
  expect(screen.getByText(t.enums.leadStatus.new)).toBeTruthy();
  expect(screen.getByTestId('nuqta-hollow', hidden)).toBeTruthy();
  expect(screen.getByTestId('chip-act')).toBeTruthy();
});

test('a cancelled lesson is struck and cinnabar', async () => {
  await render(
    <StatusChip
      {...lessonStatusStyle.cancelled_by_teacher}
      label={t.enums.lessonStatus.cancelled_by_teacher}
      size="sm"
    />,
  );
  expect(screen.getByTestId('nuqta-struck', hidden)).toBeTruthy();
  expect(screen.getByTestId('chip-bad')).toHaveStyle({ height: 22 });
});

test.each<[Tone, string, string]>([
  ['ok', 'ok', 'okSoft'],
  ['act', 'act', 'actSoft'],
  ['bad', 'bad', 'badSoft'],
  ['neutral', 'ink2', 'neutralSoft'],
])('%s tone uses %s on %s', (tone, fg, bg) => {
  const c = palette.light;
  expect(toneColors(c, tone)).toEqual({ fg: c[fg as keyof typeof c], bg: c[bg as keyof typeof c] });
});

test('saffron only through the act tone', () => {
  const c = palette.dark;
  const fgs = (['ok', 'bad', 'neutral'] as const).map((tone) => toneColors(c, tone).fg);
  expect(fgs).not.toContain(c.act);
});
