import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { lesson } from '@/portal/portal.fixtures';
import { DeclineForm } from './DeclineForm';

const now = new Date('2026-11-16T10:00:00.000Z');
const A = t.portal.actions;
const withCounts = (counts: boolean) =>
  lesson(now, 60, { status: 'scheduled', family: { group: false, counts, request: null } });
const show = (counts: boolean, busy = false) => {
  const onDecline = jest.fn();
  const onBack = jest.fn();
  const view = render(
    <DeclineForm
      lesson={withCounts(counts)}
      title="الاعتذار عن حلقة الغد"
      busy={busy}
      onDecline={onDecline}
      onBack={onBack}
    />,
  );
  return { view, onDecline, onBack };
};

test('the title and the package line before confirming', async () => {
  await show(true).view;
  expect(screen.getByText('الاعتذار عن حلقة الغد')).toBeTruthy();
  expect(screen.getByText(A.countsYes)).toBeTruthy();
});

test('a lesson that does not count says so', async () => {
  await show(false).view;
  expect(screen.getByText(A.countsNo)).toBeTruthy();
});

test('confirming sends the trimmed reason; no reason sends an empty one', async () => {
  const { view, onDecline } = show(false);
  await view;
  await fireEvent.press(screen.getByRole('button', { name: A.declineConfirm }));
  expect(onDecline).toHaveBeenLastCalledWith('');
  await fireEvent.changeText(screen.getByLabelText(A.reasonLabel), '  سفر  ');
  await fireEvent.press(screen.getByRole('button', { name: A.declineConfirm }));
  expect(onDecline).toHaveBeenLastCalledWith('سفر');
});

test('«رجوع» goes back without declining', async () => {
  const { view, onDecline, onBack } = show(false);
  await view;
  await fireEvent.press(screen.getByRole('button', { name: A.back }));
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(onDecline).not.toHaveBeenCalled();
});

test('while busy the confirm button is disabled', async () => {
  const { view, onDecline } = show(false, true);
  await view;
  expect(screen.getByRole('button', { name: A.declineConfirm })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: A.declineConfirm }));
  expect(onDecline).not.toHaveBeenCalled();
});
