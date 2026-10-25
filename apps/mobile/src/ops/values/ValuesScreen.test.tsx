import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { settings } from '../shared/fixtures';
import { groupLabel } from './value-groups';
import { labelOf } from './value-text';
import { valuesAnswer, WRITER } from './values-fixtures';
import { ValuesScreen } from './ValuesScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(valuesAnswer(WRITER));
});

const row = (label: string) => screen.findByRole('button', { name: new RegExp(label.replace(/[()]/g, '.')) });

test('«القيم» opens on «الجدول والحلقات» as a two-column table', async () => {
  await renderWithQuery(<ValuesScreen />);
  expect(screen.getByRole('header', { name: t.mobileValues.title })).toBeTruthy();
  expect(await screen.findByText(labelOf('booking_horizon_weeks'))).toBeTruthy();
  expect(screen.getByText(t.mobileValues.name, { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByText('5')).toBeTruthy();
  expect(screen.queryByText(labelOf('reporting_currency'))).toBeNull();
});

test('a group chip switches the table to that group', async () => {
  await renderWithQuery(<ValuesScreen />);
  await screen.findByText(labelOf('booking_horizon_weeks'));
  await fireEvent.press(screen.getByRole('radio', { name: new RegExp(groupLabel('accounts')) }));
  expect(await screen.findByText(labelOf('reporting_currency'))).toBeTruthy();
  expect(screen.queryByText(labelOf('booking_horizon_weeks'))).toBeNull();
});

test('the sheet saves only its own key and shows «تم حفظ القيمة»', async () => {
  mockApiSend.mockResolvedValue({ ...settings, booking_horizon_weeks: 8 });
  await renderWithQuery(<ValuesScreen />);
  await fireEvent.press(await row(labelOf('booking_horizon_weeks')));
  expect(screen.getByText(t.settings.hints.bookingHorizonWeeks)).toBeTruthy();
  expect(await screen.findByText(/سارة/)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(labelOf('booking_horizon_weeks')), '8');
  await fireEvent.press(screen.getByRole('button', { name: t.config.custom.save }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/settings', { bookingHorizonWeeks: 8 }),
  );
  expect(await screen.findByText(t.config.custom.saved)).toBeTruthy();
  expect(screen.getByText('8')).toBeTruthy();
});

test('a bad number is refused in the sheet; nothing is sent', async () => {
  await renderWithQuery(<ValuesScreen />);
  await fireEvent.press(await row(labelOf('booking_horizon_weeks')));
  await fireEvent.changeText(screen.getByLabelText(labelOf('booking_horizon_weeks')), '999');
  await fireEvent.press(screen.getByRole('button', { name: t.config.custom.save }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a `{saved, moved}` answer naming the key says «تُدار من صفحة أخرى»', async () => {
  mockApiSend.mockResolvedValue({ saved: [], moved: ['booking_horizon_weeks'] });
  await renderWithQuery(<ValuesScreen />);
  await fireEvent.press(await row(labelOf('booking_horizon_weeks')));
  await fireEvent.changeText(screen.getByLabelText(labelOf('booking_horizon_weeks')), '8');
  await fireEvent.press(screen.getByRole('button', { name: t.config.custom.save }));
  expect(await screen.findByText(t.mobileValues.owned)).toBeTruthy();
  expect(screen.queryByText(t.config.custom.saved)).toBeNull();
});

test('closing with an unsaved edit asks first; «تابع التعديل» keeps the edit', async () => {
  await renderWithQuery(<ValuesScreen />);
  await fireEvent.press(await row(labelOf('booking_horizon_weeks')));
  await fireEvent.changeText(screen.getByLabelText(labelOf('booking_horizon_weeks')), '9');
  await fireEvent.press(screen.getByRole('button', { name: t.config.custom.cancel }));
  expect(screen.getByText(t.mobileValues.unsavedClose)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobileValues.keepEditing }));
  expect(screen.getByLabelText(labelOf('booking_horizon_weeks')).props.value).toBe('9');
  await fireEvent.press(screen.getByRole('button', { name: t.config.custom.cancel }));
  await fireEvent.press(screen.getByRole('button', { name: t.mobileValues.closeAnyway }));
  expect(screen.queryByText(t.settings.hints.bookingHorizonWeeks)).toBeNull();
});

test('the API down with nothing cached: error with retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<ValuesScreen />);
  expect(await screen.findByRole('button', { name: t.mobile.retry })).toBeTruthy();
});
