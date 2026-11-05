import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { CorrectOutcome } from './CorrectOutcome';

test('the title, its hint and one button per target, each sending its status', async () => {
  const onCorrect = jest.fn();
  await render(<CorrectOutcome targets={['completed', 'no_show']} onCorrect={onCorrect} />);
  expect(screen.getByText(t.lessons.correct.outcomeTitle)).toBeTruthy();
  expect(screen.getByText(t.lessons.correct.outcomeHint)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.lessons.correct.to.excused })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.correct.to.completed }));
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.correct.to.no_show }));
  expect(onCorrect.mock.calls).toEqual([['completed'], ['no_show']]);
});

test('a refused correction says why', async () => {
  await render(<CorrectOutcome targets={['completed']} onCorrect={jest.fn()} error={t.lessons.error.earning_paid} />);
  expect(screen.getByText(t.lessons.error.earning_paid)).toBeTruthy();
});
