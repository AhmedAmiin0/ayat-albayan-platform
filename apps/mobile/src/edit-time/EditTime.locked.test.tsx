import { fireEvent, screen } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { monthLabel } from '@/teacher/lib/payout-text';
import { renderWithQuery } from '@/test/query';
import { EditTimeSheet } from './components/EditTimeSheet';
import { held, NOW, result } from './testing/fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

// A correction that changes the length after the teacher's payout for the month was approved.

const submit = () => screen.getByRole('button', { name: t.editTime.submit });
const pill = (min: '45' | '60' | '90') => screen.getByRole('radio', { name: t.enums.duration[min] });
const restore = () => screen.getByRole('button', { name: t.editTime.restoreLength.replace('{len}', t.enums.duration['45']) });

async function lockedOnSixty() {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'payout_locked', month: '2026-09', status: 'approved' }));
  await renderWithQuery(<EditTimeSheet lesson={held} onClose={jest.fn()} />);
  await fireEvent.press(pill('60'));
  await fireEvent.changeText(screen.getByLabelText(t.editTime.reason), 'الحلقة خدت ساعة');
  await fireEvent.press(submit());
  await screen.findByText(
    t.editTime.lockedMonth.replace('{month}', monthLabel('2026-09')).replace('{status}', t.enums.payoutStatus.approved),
  );
}

test('payout_locked names the month and status, says a start-only fix still works, and holds Save back', async () => {
  await lockedOnSixty();
  expect(screen.getByText(t.editTime.startOnly)).toBeTruthy();
  expect(submit()).toBeDisabled();
  // The note before saving («المدة اتغيرت…») would now be a promise the save cannot keep.
  expect(screen.queryByText(t.editTime.payoutWarn)).toBeNull();
  expect(mockApiSend).toHaveBeenCalledTimes(1);
});

test('the lock survives a change to another length (the old error is reset, the hold is not)', async () => {
  await lockedOnSixty();
  await fireEvent.press(pill('90'));
  expect(screen.getByText(t.editTime.startOnly)).toBeTruthy();
  expect(submit()).toBeDisabled();
});

test('«رجّع المدة» puts the recorded length back; a start-only correction then saves', async () => {
  await lockedOnSixty();
  await fireEvent.press(restore());
  expect(screen.getByRole('radio', { name: t.enums.duration['45'], checked: true })).toBeTruthy();
  expect(screen.queryByText(t.editTime.startOnly)).toBeNull();
  // Same start, same length: nothing to save yet.
  expect(submit()).toBeDisabled();
  expect(screen.getByText(t.editTime.unchanged)).toBeTruthy();

  mockApiSend.mockResolvedValue(result({ lesson: held }));
  await fireEvent.press(screen.getByRole('radio', { name: '09:45' }));
  expect(submit()).toBeEnabled();
  await fireEvent.press(submit());
  expect(mockApiSend).toHaveBeenLastCalledWith(
    'PATCH',
    '/lessons/l-done/time',
    expect.objectContaining({ startsAt: '2026-10-01T06:45:00.000Z', durationMin: 45 }),
  );
  expect(await screen.findByText(t.editTime.saved)).toBeTruthy();
});

test('an older API that sends no month: the general line, the same hold', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'payout_locked' }));
  await renderWithQuery(<EditTimeSheet lesson={held} onClose={jest.fn()} />);
  await fireEvent.press(pill('60'));
  await fireEvent.changeText(screen.getByLabelText(t.editTime.reason), 'x');
  await fireEvent.press(submit());
  expect(await screen.findByText(t.editTime.error.payout_locked)).toBeTruthy();
  expect(submit()).toBeDisabled();
});
