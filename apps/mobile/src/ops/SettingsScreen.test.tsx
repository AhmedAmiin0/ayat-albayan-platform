import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { settings } from './fixtures';
import { SettingsScreen } from './SettingsScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue(settings);
});

const box = (label: string) => screen.findByLabelText(label);

test('loads the saved values; Save is off until something changes', async () => {
  await renderWithQuery(<SettingsScreen />);
  expect((await box(t.settings.bookingHorizonWeeks)).props.value).toBe('5');
  expect((await box(t.settings.reportingCurrency)).props.value).toBe('SAR');
  expect(
    screen.getByRole('button', { name: t.common.save }).props.accessibilityState.disabled,
  ).toBe(true);
  expect(screen.queryByText(t.mobileAdmin.settings.unsaved)).toBeNull();
});

test('editing marks it dirty, Save sends only the changed field, the saved note shows', async () => {
  mockApiSend.mockResolvedValue({ ...settings, booking_horizon_weeks: 8 });
  await renderWithQuery(<SettingsScreen />);
  await fireEvent.changeText(await box(t.settings.bookingHorizonWeeks), '8');
  expect(screen.getByText(t.mobileAdmin.settings.unsaved)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/settings', { bookingHorizonWeeks: 8 }),
  );
  expect(await screen.findByText(t.settings.saved)).toBeTruthy();
  expect(screen.queryByText(t.mobileAdmin.settings.unsaved)).toBeNull();
});

test('«أيام انتهاء الاشتراك» is offered with its hint and saves its days', async () => {
  await renderWithQuery(<SettingsScreen />);
  await fireEvent.changeText(await box(t.settings.subscriptionExpiryDays), '10');
  expect(screen.getByText(t.settings.hints.subscriptionExpiryDays)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/settings', { subscriptionExpiryDays: 10 }));
});

test('a bad number is refused on the phone, nothing is sent; typing clears the line', async () => {
  await renderWithQuery(<SettingsScreen />);
  await fireEvent.changeText(await box(t.settings.renewalAlertRemaining), '99');
  await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.changeText(await box(t.settings.renewalAlertRemaining), '3');
  expect(screen.queryByRole('alert')).toBeNull();
});

test('the API’s validation error lands on its field', async () => {
  mockApiSend.mockRejectedValue(
    new ApiError(400, {
      message: 'validation_failed',
      issues: [{ path: 'followUpHours', message: 'not_ascending' }],
    }),
  );
  await renderWithQuery(<SettingsScreen />);
  await fireEvent.changeText(await box(t.mobileAdmin.settings.followUpHours), '24, 48');
  await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
  expect(await screen.findByText(t.settings.notAscending)).toBeTruthy();
  expect(screen.getByText(t.mobileAdmin.settings.serverRejected)).toBeTruthy();
});

test('Discard puts the saved values back', async () => {
  await renderWithQuery(<SettingsScreen />);
  await fireEvent.changeText(await box(t.settings.bookingHorizonWeeks), '9');
  await fireEvent.press(screen.getByRole('button', { name: t.mobileAdmin.settings.discard }));
  expect((await box(t.settings.bookingHorizonWeeks)).props.value).toBe('5');
});

test('messaging switches are read-only with the web note, and never in a PATCH', async () => {
  await renderWithQuery(<SettingsScreen />);
  expect(await screen.findByText(t.mobileAdmin.settings.messagingEnabled)).toBeTruthy();
  expect(screen.getByText(t.mobileAdmin.settings.readOnlyNote)).toBeTruthy();
  expect(screen.queryByLabelText(t.mobileAdmin.settings.messagingEnabled)).toBeNull();
});

test('the API down with nothing cached: error with retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<SettingsScreen />);
  expect(await screen.findByRole('button', { name: t.mobile.retry })).toBeTruthy();
});
