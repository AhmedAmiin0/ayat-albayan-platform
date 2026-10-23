import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { catalogue } from '../fixtures';
import { NotificationCatalogue } from '../NotificationCatalogue';
import { answer, catalogueV2, MANAGER, READER, withUnknownBlocker } from './rules-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));

const c = t.notificationCatalogue;
const r = t.mobileNotificationRules;

beforeEach(() => jest.clearAllMocks());

test('without notifications.manage the v2 list is read-only, as before', async () => {
  mockApiFetch.mockImplementation(answer(catalogueV2, READER));
  await renderWithQuery(<NotificationCatalogue />);
  expect(await screen.findByText(c.entries.report_ready.name)).toBeTruthy();
  expect(screen.queryAllByRole('switch')).toHaveLength(0);
  expect(screen.queryByText(r.locked)).toBeNull();
  expect(screen.getByText(`${c.readOnly} · ${c.intro}`)).toBeTruthy();
});

test('a v1 answer (no rule) renders read-only even for a manager', async () => {
  mockApiFetch.mockImplementation(answer(catalogue, MANAGER));
  await renderWithQuery(<NotificationCatalogue />);
  expect(await screen.findByText(c.entries.report_ready.name)).toBeTruthy();
  expect(screen.queryAllByRole('switch')).toHaveLength(0);
  expect(screen.queryByText(r.locked)).toBeNull();
  // The v1 facts keep the blocker in words.
  expect(screen.getAllByText(new RegExp(c.blockers.auto_off)).length).toBeGreaterThan(0);
});

test('a row held by the classroom says why, and «معتمد جزئيًا» on its own line', async () => {
  mockApiFetch.mockImplementation(answer(catalogueV2, MANAGER));
  await renderWithQuery(<NotificationCatalogue />);
  await screen.findByText(c.entries.lesson_join_link.name);
  expect(screen.getByText(r.heldNow.replace('{reason}', r.blockers.classroom_off))).toBeTruthy();
  expect(screen.getByText(r.partial)).toBeTruthy();
  expect(screen.getAllByText(r.heldNow.replace('{reason}', r.blockers.auto_off)).length).toBeGreaterThan(0);
});

test('a blocker this build does not know renders no reason and nothing breaks', async () => {
  mockApiFetch.mockImplementation(answer(withUnknownBlocker, MANAGER));
  await renderWithQuery(<NotificationCatalogue />);
  expect(await screen.findByText(c.entries.renewal_due.name)).toBeTruthy();
  expect(screen.queryByText(/future_reason|undefined/)).toBeNull();
  expect(screen.getByRole('switch', { name: r.switchLabel.replace('{name}', c.entries.renewal_due.name) })).toBeTruthy();
});

test('a key this build does not know is left out', async () => {
  const extra = { ...catalogueV2.entries[0], key: 'future_key' };
  mockApiFetch.mockImplementation(answer({ ...catalogueV2, entries: [...catalogueV2.entries, extra] } as unknown as typeof catalogueV2, MANAGER));
  await renderWithQuery(<NotificationCatalogue />);
  expect(await screen.findByText(c.entries.report_ready.name)).toBeTruthy();
  expect(screen.queryByText('future_key')).toBeNull();
});
