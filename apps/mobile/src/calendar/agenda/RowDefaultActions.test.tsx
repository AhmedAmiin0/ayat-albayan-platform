import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { pending } from '@/today/testing/fixtures';
import { RowDefaultActions } from './RowDefaultActions';

test('«غيّر الميعاد» when the lesson can move, and it fires with the lesson', async () => {
  const onReschedule = jest.fn();
  await render(<RowDefaultActions lesson={pending} onReschedule={onReschedule} />);
  await fireEvent.press(screen.getByRole('button', { name: `${t.lessons.rescheduleSubmit} — يوسف أحمد` }));
  expect(onReschedule).toHaveBeenCalledWith(pending);
});

test('a teacher’s lesson (no reschedule, no time edit) renders nothing', async () => {
  await render(<RowDefaultActions lesson={{ ...pending, allowed_events: ['confirm'] }} onReschedule={jest.fn()} />);
  expect(screen.queryByRole('button')).toBeNull();
});
