import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { NotificationCatalogue } from '../NotificationCatalogue';
import { rowsOf } from './audience-tabs';
import { answer, catalogueV2, MANAGER, openAudience } from './rules-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));

const c = t.notificationCatalogue;
const r = t.mobileNotificationRules;
const shown = (keys: readonly (keyof typeof c.entries)[]) => keys.filter((k) => screen.queryByText(c.entries[k].name) !== null);

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(answer(catalogueV2, MANAGER));
});

test('«الإشعارات» opens on ولي الأمر and shows only that audience', async () => {
  await renderWithQuery(<NotificationCatalogue />);
  expect(await screen.findByText(r.title)).toBeTruthy();
  const pills = await screen.findAllByRole('tab');
  expect(pills.map((p) => p.props.accessibilityState.selected)).toEqual([true, false, false, false, false]);
  const guardian = rowsOf(catalogueV2.entries, 'guardian').map((e) => e.key);
  expect(shown(guardian)).toEqual(guardian);
  expect(shown(['teacher_lesson_reminder', 'follow_up_slots', 'reminder_failed', 'inbox_templates'])).toEqual([]);
});

test('each pill swaps the rows for its audience, in the web order', async () => {
  await renderWithQuery(<NotificationCatalogue />);
  await screen.findByText(r.title);
  const labels = [c.audience.guardian, c.audience.teacher, c.audience.lead, c.audience.staff, c.states.manual];
  const pills = await screen.findAllByRole('tab');
  expect(labels.map((l) => pills.indexOf(screen.getByRole('tab', { name: new RegExp(`^${l}`) })))).toEqual([0, 1, 2, 3, 4]);
  await openAudience(c.audience.teacher);
  expect(shown(['teacher_lesson_reminder', 'booking_confirmation'])).toEqual(['teacher_lesson_reminder']);
  await openAudience(c.audience.lead);
  expect(shown(['follow_up_slots', 'teacher_lesson_reminder'])).toEqual(['follow_up_slots']);
  await openAudience(c.audience.staff);
  expect(shown(['reminder_failed', 'follow_up_slots'])).toEqual(['reminder_failed']);
  await openAudience(c.states.manual);
  expect(shown(['inbox_templates', 'lesson_join_link_manual', 'reminder_failed'])).toEqual(['inbox_templates', 'lesson_join_link_manual']);
});

test('changing the pill closes an open family question', async () => {
  await renderWithQuery(<NotificationCatalogue />);
  const name = c.entries.lesson_reminder_24h.name;
  await fireEvent(await screen.findByRole('switch', { name: r.switchLabel.replace('{name}', name) }), 'valueChange', true);
  expect(screen.getByRole('button', { name: r.turnOn })).toBeTruthy();
  await openAudience(c.audience.teacher);
  await openAudience(c.audience.guardian);
  expect(screen.queryByRole('button', { name: r.turnOn })).toBeNull();
});

test('an audience with no rows says so', async () => {
  const noLeads = { ...catalogueV2, entries: catalogueV2.entries.filter((e) => e.audience !== 'lead' || e.manual) };
  mockApiFetch.mockImplementation(answer(noLeads, MANAGER));
  await renderWithQuery(<NotificationCatalogue />);
  await fireEvent.press(await screen.findByRole('tab', { name: new RegExp(`^${c.audience.lead}`) }));
  expect(screen.getByText(r.audienceEmpty)).toBeTruthy();
});
