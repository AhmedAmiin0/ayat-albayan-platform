import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { CommunicationsScreen } from './CommunicationsScreen';
import { overviewAnswer } from './comms/comms-fixtures';
import { readOnlyNoteText } from './ReadOnlySettings';

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

/** The web note, with what else is managed on the web folded into it. */
const WEB_NOTE = readOnlyNoteText(t.communicationsHub.webOnly);

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(overviewAnswer);
});

test('«التواصل» opens on the overview: the send state is read-only, with the web note; nothing is sent', async () => {
  await renderWithQuery(<CommunicationsScreen />);
  expect(screen.getByRole('header', { name: t.settingsPages.communications })).toBeTruthy();
  expect(await screen.findByText(t.mobileAdmin.settings.messagingEnabled)).toBeTruthy();
  expect(screen.getByText(WEB_NOTE)).toBeTruthy();
  expect(screen.queryByLabelText(t.mobileAdmin.settings.messagingEnabled)).toBeNull();
  expect(screen.queryAllByRole('switch')).toHaveLength(0);
  expect(mockApiSend).not.toHaveBeenCalled();
});

const tab = (name: string) => screen.getByRole('tab', { name });

test('«التواصل» is three tabs (نظرة عامة · الإشعارات · الأرقام), one shown at a time', async () => {
  await renderWithQuery(<CommunicationsScreen />);
  const tabs = t.settingsPages.communicationsTabs;
  expect(tab(tabs.overview).props.accessibilityState).toEqual({ selected: true });
  expect(screen.getAllByRole('tab').map((el) => el.props.accessibilityState)).toEqual([
    { selected: true },
    { selected: false },
    { selected: false },
  ]);
  expect(await screen.findByText(WEB_NOTE)).toBeTruthy();
  expect(screen.queryByText(t.notificationCatalogue.entries.report_ready.name)).toBeNull();
  await fireEvent.press(tab(t.settingsValues.groups.notifications));
  expect(tab(t.settingsValues.groups.notifications).props.accessibilityState).toEqual({ selected: true });
  expect(await screen.findByText(t.notificationCatalogue.entries.report_ready.name)).toBeTruthy();
  expect(screen.queryByText(WEB_NOTE)).toBeNull();
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

const audiencePill = (label: string) => screen.findByRole('tab', { name: new RegExp(`^${label}`) });

test('a «ماذا يُرسل الآن» row opens «الإشعارات» on that audience; the tab pill opens it on ولي الأمر', async () => {
  await renderWithQuery(<CommunicationsScreen />);
  const audience = t.notificationCatalogue.audience;
  const teacher = t.communicationsHub.openAudience.replace('{audience}', audience.teacher);
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${teacher}`) }));
  expect(tab(t.settingsValues.groups.notifications).props.accessibilityState).toEqual({ selected: true });
  expect((await audiencePill(audience.teacher)).props.accessibilityState).toEqual({ selected: true });
  expect((await audiencePill(audience.guardian)).props.accessibilityState).toEqual({ selected: false });
  await fireEvent.press(tab(t.settingsPages.communicationsTabs.overview));
  await fireEvent.press(tab(t.settingsValues.groups.notifications));
  expect((await audiencePill(audience.guardian)).props.accessibilityState).toEqual({ selected: true });
});

test('«افتح «الأرقام»» on the overview switches to the numbers tab', async () => {
  await renderWithQuery(<CommunicationsScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.communicationsHub.numbersOpen }));
  expect(tab(t.settingsPages.communicationsTabs.numbers).props.accessibilityState).toEqual({ selected: true });
  expect(await screen.findByRole('header', { name: t.numbers.title })).toBeTruthy();
});
