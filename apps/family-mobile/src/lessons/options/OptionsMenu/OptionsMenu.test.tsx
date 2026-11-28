import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { lesson } from '@/portal/portal.fixtures';
import { OptionsMenu } from './OptionsMenu';

const now = new Date('2026-11-16T10:00:00.000Z');
const A = t.portal.actions;
const title = {
  heading: 'حلقة الغد',
  subline: 'مع فاطمة · 45 دقيقة',
  decline: 'الاعتذار عن حلقة الغد',
};
const open = lesson(now, 24 * 60, {
  status: 'scheduled',
  family: { group: false, counts: false, request: null },
});
const show = (error: string | null = null) => {
  const calls = { onClose: jest.fn(), onPick: jest.fn(), onDecline: jest.fn() };
  const view = render(
    <OptionsMenu
      lesson={open}
      title={title}
      now={now}
      open
      busy={false}
      error={error}
      {...calls}
    />,
  );
  return { view, ...calls };
};

test('the heading, the subline and one button per option', async () => {
  await show().view;
  expect(screen.getByText(title.heading)).toBeTruthy();
  expect(screen.getByText(title.subline)).toBeTruthy();
  expect(screen.getByRole('button', { name: A.confirm })).toBeTruthy();
  expect(screen.getByRole('button', { name: A.decline })).toBeTruthy();
});

test('an option other than decline is handed over', async () => {
  const { view, onPick } = show();
  await view;
  await fireEvent.press(screen.getByRole('button', { name: A.confirm }));
  expect(onPick).toHaveBeenCalledWith('confirm');
});

test('decline opens the form; back returns to the options', async () => {
  const { view, onPick } = show();
  await view;
  await fireEvent.press(screen.getByRole('button', { name: A.decline }));
  expect(screen.getByText(title.decline)).toBeTruthy();
  expect(onPick).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: A.back }));
  expect(screen.getByRole('button', { name: A.confirm })).toBeTruthy();
});

test('an error shows its line', async () => {
  await show('تعذّر الإرسال').view;
  expect(screen.getByText('تعذّر الإرسال')).toBeTruthy();
});

test('a drag down hands the close over and leaves the decline form', async () => {
  const { view, onClose } = show();
  await view;
  await fireEvent.press(screen.getByRole('button', { name: A.decline }));
  await fireEvent(screen.getByTestId('lesson-options'), 'dismiss');
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: A.confirm })).toBeTruthy();
});
