import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { catalogue, settings } from './fixtures';
import { NotificationCatalogue } from './NotificationCatalogue';
import { whenOf } from './catalogue-words';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));

const c = t.notificationCatalogue;

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (p: string) => (p === '/admin/notifications' ? catalogue : settings));
});

test('lists every notification with its state and the first blocker in words; nothing to switch', async () => {
  await renderWithQuery(<NotificationCatalogue />);
  expect(await screen.findByText(c.entries.report_ready.name)).toBeTruthy();
  expect(screen.getByText(c.entries.reminder_failed.name)).toBeTruthy();
  // Automatic messages are off in the fixture: the reminder is held, with the reason.
  expect(screen.getAllByText(new RegExp(c.blockers.auto_off)).length).toBeGreaterThan(0);
  expect(screen.getAllByText(c.states.off).length).toBeGreaterThan(0);
  expect(screen.queryAllByRole('switch')).toHaveLength(0);
});

test('the kept number shows without a live check; a line never checked says so', async () => {
  await renderWithQuery(<NotificationCatalogue />);
  expect(await screen.findByText(`${c.lines.notifications}: ${ltr('+966 55 123 4567')}`)).toBeTruthy();
  expect(screen.getByText(`${c.lines.chat}: ${c.notChecked}`)).toBeTruthy();
});

test('a failed read says so and retries', async () => {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/admin/notifications' ? Promise.reject(new Error('down')) : settings));
  await renderWithQuery(<NotificationCatalogue />);
  expect(await screen.findByText(c.loadError)).toBeTruthy();
  mockApiFetch.mockImplementation(async (p: string) => (p === '/admin/notifications' ? catalogue : settings));
  fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByText(c.entries.report_ready.name)).toBeTruthy();
  expect(screen.queryByText(c.loadError)).toBeNull();
});

test('the when-line wraps (never cut to one line), so its timing stays readable at 390px', async () => {
  await renderWithQuery(<NotificationCatalogue />);
  await screen.findByText(c.entries.report_ready.name);
  const entry = catalogue.entries.find((e) => e.timing) ?? catalogue.entries[0];
  if (!entry) throw new Error('fixture has no entries');
  const when = screen.getByText(whenOf(entry));
  expect(when.props.numberOfLines).toBeUndefined();
});
