import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { EditTimeSheet } from './EditTimeSheet';
import { held, NOW, result } from './fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

const submit = () => screen.getByRole('button', { name: t.editTime.submit });

async function open() {
  const client = createTestQueryClient();
  await renderWithQuery(<EditTimeSheet lesson={held} onClose={jest.fn()} />, client);
  return client;
}

test('a held lesson is a correction: its own title, the day fixed, same-day times, no slot grid asked', async () => {
  await open();
  expect(screen.getByRole('header', { name: t.editTime.correctTitle })).toBeTruthy();
  expect(screen.getByText(t.editTime.dayFixed.replace('{day}', 'الخميس 1 أكتوبر'))).toBeTruthy();
  expect(screen.getByRole('radio', { name: '10:00', checked: true })).toBeTruthy();
  expect(screen.getByRole('radio', { name: '10:15' })).toBeTruthy();
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('the session ran an hour: the reason is required before «احفظ التعديل»', async () => {
  mockApiSend.mockResolvedValue(
    result({ lesson: held, payout: 'draft_stale', pdf_refresh: true }),
  );
  await open();
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.duration['60'] }));
  expect(screen.getByText(t.editTime.sameLesson)).toBeTruthy();
  // Before saving: attendance and status stay, the payout moves with the length, the PDF is made again.
  expect(screen.getByText(t.editTime.heldNote)).toBeTruthy();
  expect(screen.getByText(t.editTime.payoutWarn)).toBeTruthy();
  expect(screen.getByText(t.editTime.pdfRefresh)).toBeTruthy();
  expect(screen.getByText(t.editTime.error.reason_required)).toBeTruthy();
  // No guardian message for a correction, and no «غيّر الميعاد» hint.
  expect(screen.queryByRole('switch')).toBeNull();
  expect(screen.queryByText(t.editTime.vsReschedule)).toBeNull();
  expect(submit()).toBeDisabled();

  await fireEvent.changeText(screen.getByLabelText(t.editTime.reason), '  الحلقة خدت ساعة بدل 45 دقيقة ');
  await fireEvent.press(submit());
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/lessons/l-done/time', {
    expectedStartsAt: held.starts_at,
    expectedEndsAt: held.ends_at,
    startsAt: held.starts_at,
    durationMin: 60,
    reason: 'الحلقة خدت ساعة بدل 45 دقيقة',
  });
  expect(await screen.findByText(t.editTime.saved)).toBeTruthy();
  // What the correction set in motion: the payout month to recalculate, the PDF made again.
  expect(screen.getByText(t.editTime.payoutDraft)).toBeTruthy();
  expect(screen.getByText(t.editTime.pdfRefresh)).toBeTruthy();
});

test('a corrected start is picked from the list, not typed', async () => {
  mockApiSend.mockResolvedValue(result({ lesson: held }));
  await open();
  await fireEvent.press(screen.getByRole('radio', { name: '09:45' }));
  await fireEvent.changeText(screen.getByLabelText(t.editTime.reason), 'بدأت بدري');
  await fireEvent.press(submit());
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/lessons/l-done/time', {
    expectedStartsAt: held.starts_at,
    expectedEndsAt: held.ends_at,
    startsAt: '2026-10-01T06:45:00.000Z',
    durationMin: 45,
    reason: 'بدأت بدري',
  });
});

test('no payout or PDF line when the API reports none', async () => {
  mockApiSend.mockResolvedValue(result({ lesson: held }));
  await open();
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.duration['90'] }));
  await fireEvent.changeText(screen.getByLabelText(t.editTime.reason), 'x');
  await fireEvent.press(submit());
  await screen.findByText(t.editTime.saved);
  expect(screen.queryByText(t.editTime.payoutDraft)).toBeNull();
  expect(screen.queryByText(t.editTime.pdfRefresh)).toBeNull();
});
