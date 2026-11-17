import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { CorrectOutcome } from './CorrectOutcome';

const c = t.lessons.correct;

test('the title, its hint and one button per target; each asks first, then sends its status', async () => {
  const onCorrect = jest.fn();
  await render(<CorrectOutcome targets={['completed', 'no_show']} onCorrect={onCorrect} />);
  expect(screen.getByText(c.outcomeTitle)).toBeTruthy();
  expect(screen.getByText(c.outcomeHint)).toBeTruthy();
  expect(screen.queryByRole('button', { name: c.to.excused })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: c.to.no_show }));
  expect(onCorrect).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: c.confirm }));
  expect(onCorrect.mock.calls).toEqual([['no_show']]);
});

test('the confirm says whether the lesson counts from the package; «رجوع» goes back', async () => {
  const onCorrect = jest.fn();
  await render(<CorrectOutcome targets={['completed', 'cancelled_by_teacher']} onCorrect={onCorrect} />);
  await fireEvent.press(screen.getByRole('button', { name: c.to.cancelled_by_teacher }));
  const ask = `${c.ask.replace('{to}', c.to.cancelled_by_teacher)} ${c.counts.cancelled_by_teacher}`;
  expect(screen.getByText(ask)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(screen.getByRole('button', { name: c.to.completed })).toBeTruthy();
  expect(onCorrect).not.toHaveBeenCalled();
});

test('a refused correction says why', async () => {
  await render(<CorrectOutcome targets={['completed']} onCorrect={jest.fn()} error={t.lessons.error.earning_paid} />);
  expect(screen.getByText(t.lessons.error.earning_paid)).toBeTruthy();
});
