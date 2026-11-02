import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { CorrectAutoHeld } from './CorrectAutoHeld';

test('the title, its hint and «ألغاها المعلم/ة» / «اعتذر الطالب», each sending its `by`', async () => {
  const onCorrect = jest.fn();
  await render(<CorrectAutoHeld onCorrect={onCorrect} />);
  expect(screen.getByText(t.lessons.correct.title)).toBeTruthy();
  expect(screen.getByText(t.lessons.correct.hint)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.correct.byTeacher }));
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.correct.byStudent }));
  expect(onCorrect.mock.calls).toEqual([['teacher'], ['student']]);
});

test('a refused correction says why', async () => {
  await render(<CorrectAutoHeld onCorrect={jest.fn()} error={t.lessons.error.not_auto_held} />);
  expect(screen.getByText(t.lessons.error.not_auto_held)).toBeTruthy();
});
