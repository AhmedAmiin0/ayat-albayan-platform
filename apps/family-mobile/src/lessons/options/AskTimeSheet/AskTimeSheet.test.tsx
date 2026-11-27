import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { lesson, student } from '@/portal/portal.fixtures';
import { AskTimeSheet } from './AskTimeSheet';

const mockFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (path: string) => mockFetch(path),
}));

const now = new Date('2026-11-16T10:00:00.000Z');
const free = '2026-11-18T14:30:00.000Z';
const A = t.portal.actions;
const show = (open: boolean, error: string | null = null) => {
  const onSend = jest.fn();
  const view = renderWithQuery(
    <AskTimeSheet
      lesson={lesson(now, 24 * 60)}
      student={student()}
      open={open}
      busy={false}
      error={error}
      onClose={jest.fn()}
      onSend={onSend}
    />,
    freshQueryClient(),
  );
  return { view, onSend };
};

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    tz: 'Asia/Riyadh',
    step_min: 45,
    slots: [{ starts_at: free, ends_at: free }],
  });
});

test('closed: no body and no slots fetched', async () => {
  await show(false).view;
  expect(screen.queryByText(student().name)).toBeNull();
  expect(mockFetch).not.toHaveBeenCalled();
});

test('open: the student, the current time, and «أرسل الطلب» waits for a pick', async () => {
  const { view, onSend } = show(true);
  await view;
  expect(screen.getByText(student().name)).toBeTruthy();
  expect(screen.getByText(new RegExp(`^${A.currentWhen.replace('{when}', '')}`))).toBeTruthy();
  expect(screen.getByRole('button', { name: A.send })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: A.send }));
  expect(onSend).not.toHaveBeenCalled();
});

test('a picked slot and a trimmed note are sent', async () => {
  const { view, onSend } = show(true);
  await view;
  await fireEvent.press(await screen.findByRole('radio', { name: /^(17:30|5:30 م)$/ }));
  await fireEvent.changeText(screen.getByLabelText(A.noteLabel), '  بعد العصر  ');
  await fireEvent.press(screen.getByRole('button', { name: A.send }));
  expect(onSend).toHaveBeenCalledWith({ startsAt: free, note: 'بعد العصر' });
});

test('an error shows its line', async () => {
  await show(true, 'تعذّر الإرسال').view;
  expect(screen.getByText('تعذّر الإرسال')).toBeTruthy();
});
