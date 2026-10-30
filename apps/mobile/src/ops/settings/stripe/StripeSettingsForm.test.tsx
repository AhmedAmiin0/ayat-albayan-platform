import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { StripeSettingsForm } from './StripeSettingsForm';
import { SETTINGS } from './stripe-settings.fixture';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const S = t.paymentLinks.settings;

beforeEach(() => {
  jest.clearAllMocks();
  mockApiSend.mockResolvedValue({ ...SETTINGS, enabled: true });
});

test('secrets are write-only: the masked saved key, empty inputs, the webhook URL to copy', async () => {
  await renderWithQuery(<StripeSettingsForm settings={SETTINGS} />);
  expect(screen.getByText(S.set.replace('{masked}', 'rk_test_••••abcd'))).toBeTruthy();
  expect(screen.getByText(S.notSet)).toBeTruthy();
  expect(screen.getByText(/api\.test\.example\/webhooks\/stripe/)).toBeTruthy();
  expect(screen.queryByDisplayValue(/rk_test/)).toBeNull();
});

test('«حفظ» sends one PATCH with the switch, the typed test key and the cap', async () => {
  await renderWithQuery(<StripeSettingsForm settings={SETTINGS} />);
  await fireEvent(screen.getByLabelText(S.enabled), 'valueChange', true);
  await fireEvent.changeText(screen.getByLabelText(S.apiKey), ' rk_test_51Ab ');
  await fireEvent.changeText(screen.getByLabelText(S.maxDiscount), '10');
  await fireEvent.press(screen.getByRole('button', { name: S.save }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/admin/stripe/settings', { enabled: true, maxDiscountPct: 10, apiKey: 'rk_test_51Ab' }));
  expect(await screen.findByText(S.saved)).toBeTruthy();
});

test('a live key is refused before it leaves the phone', async () => {
  await renderWithQuery(<StripeSettingsForm settings={SETTINGS} />);
  await fireEvent.changeText(screen.getByLabelText(S.apiKey), 'sk_live_51Ab');
  await fireEvent.press(screen.getByRole('button', { name: S.save }));
  expect(await screen.findByText(S.liveRefused)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('«حذف» clears a saved key at once; the API refusal shows under its field', async () => {
  await renderWithQuery(<StripeSettingsForm settings={SETTINGS} />);
  await fireEvent.press(screen.getByRole('button', { name: `${S.clear} — ${S.apiKey}` }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/admin/stripe/settings', { apiKey: null }));
  mockApiSend.mockRejectedValue(new ApiError(400, { code: 'invalid_secret' }));
  await fireEvent.changeText(screen.getByLabelText(S.webhookSecret), 'whsec_abc');
  await fireEvent.press(screen.getByRole('button', { name: S.save }));
  expect(await screen.findByText(S.invalidSecret)).toBeTruthy();
});
