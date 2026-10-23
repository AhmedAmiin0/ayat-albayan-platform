import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { CommunicationsScreen } from './CommunicationsScreen';
import { catalogue, settings } from './fixtures';
import { numbersAnswer } from './numbers-fixtures';

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
  mockApiFetch.mockImplementation(async (p: string) => numbersAnswer(p) ?? (p === '/admin/notifications' ? catalogue : settings));
});

test('«التواصل»: the send state is read-only, with the web note; nothing is sent', async () => {
  await renderWithQuery(<CommunicationsScreen />);
  expect(screen.getByRole('header', { name: t.settingsPages.communications })).toBeTruthy();
  expect(await screen.findByText(t.mobileAdmin.settings.messagingEnabled)).toBeTruthy();
  expect(screen.getByText(t.mobileAdmin.settings.readOnlyNote)).toBeTruthy();
  expect(screen.queryByLabelText(t.mobileAdmin.settings.messagingEnabled)).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});

const tab = (name: string) => screen.getByRole('tab', { name });

test('«التواصل» is three tabs (الإرسال · الإشعارات · الأرقام), one shown at a time', async () => {
  await renderWithQuery(<CommunicationsScreen />);
  const tabs = t.settingsPages.communicationsTabs;
  expect(screen.getAllByRole('tab').map((el) => el.props.accessibilityState)).toEqual([
    { selected: true },
    { selected: false },
    { selected: false },
  ]);
  expect(await screen.findByText(t.mobileAdmin.settings.readOnlyNote)).toBeTruthy();
  expect(screen.queryByText(t.notificationCatalogue.entries.report_ready.name)).toBeNull();
  await fireEvent.press(tab(t.settingsValues.groups.notifications));
  expect(tab(t.settingsValues.groups.notifications).props.accessibilityState).toEqual({ selected: true });
  expect(await screen.findByText(t.notificationCatalogue.entries.report_ready.name)).toBeTruthy();
  expect(screen.queryByText(t.mobileAdmin.settings.readOnlyNote)).toBeNull();
  await fireEvent.press(tab(tabs.numbers));
  expect(screen.queryByText(t.notificationCatalogue.entries.report_ready.name)).toBeNull();
  expect(tab(tabs.numbers).props.accessibilityState).toEqual({ selected: true });
  expect(await screen.findByRole('header', { name: t.numbers.title })).toBeTruthy();
});

test('the API down with nothing cached: error with retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<CommunicationsScreen />);
  expect((await screen.findAllByRole('button', { name: t.mobile.retry })).length).toBeGreaterThan(0);
});
