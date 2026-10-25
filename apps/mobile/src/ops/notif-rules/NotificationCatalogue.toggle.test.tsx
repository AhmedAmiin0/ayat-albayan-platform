import { counted } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { NotificationCatalogue } from '../NotificationCatalogue';
import { answer, catalogueV2, MANAGER, openAudience } from './rules-fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));

const c = t.notificationCatalogue;
const r = t.mobileNotificationRules;
const switchOf = (key: keyof typeof c.entries) => screen.findByRole('switch', { name: r.switchLabel.replace('{name}', c.entries[key].name) });
const catalogueReads = () => mockApiFetch.mock.calls.filter(([p]) => p === '/admin/notifications').length;

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(answer(catalogueV2, MANAGER));
  mockApiSend.mockResolvedValue({});
});

test('switching off a plain row saves at once, refetches the catalogue and announces it once', async () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  await renderWithQuery(<NotificationCatalogue />);
  await openAudience(c.audience.teacher);
  const sw = await switchOf('teacher_lesson_reminder');
  expect(sw.props.accessibilityState).toMatchObject({ checked: true });
  const before = catalogueReads();
  await fireEvent(sw, 'valueChange', false);
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/admin/notifications/teacher_lesson_reminder', { enabled: false });
  const saved = r.savedOff.replace('{name}', c.entries.teacher_lesson_reminder.name);
  expect(await screen.findByText(saved)).toBeTruthy();
  expect(announce).toHaveBeenCalledTimes(1);
  expect(announce).toHaveBeenCalledWith(saved);
  // No live region repeats the line on Android.
  expect(JSON.stringify(screen.toJSON())).not.toContain('accessibilityLiveRegion');
  await waitFor(() => expect(catalogueReads()).toBeGreaterThan(before));
});

test('switching on a family row first says whom it reaches; «إلغاء» sends nothing', async () => {
  await renderWithQuery(<NotificationCatalogue />);
  await fireEvent(await switchOf('lesson_reminder_24h'), 'valueChange', true);
  const name = c.entries.lesson_reminder_24h.name;
  const question = r.familyConfirm.replace('{name}', name).replace('{reach}', counted(r.reach.guardian, 214));
  expect(screen.getByText(question)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: r.cancel }));
  expect(screen.queryByText(question)).toBeNull();
  await fireEvent(await switchOf('lesson_reminder_24h'), 'valueChange', true);
  await fireEvent.press(screen.getByRole('button', { name: r.turnOn }));
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/admin/notifications/lesson_reminder_24h', { enabled: true });
  expect(await screen.findByText(r.savedOn.replace('{name}', name))).toBeTruthy();
});

test('a lead row names the leads it reaches, in the counted form', async () => {
  await renderWithQuery(<NotificationCatalogue />);
  await openAudience(c.audience.lead);
  await fireEvent(await switchOf('follow_up_slots'), 'valueChange', false);
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/admin/notifications/follow_up_slots', { enabled: false });
  mockApiSend.mockClear();
  await fireEvent(await switchOf('follow_up_slots'), 'valueChange', true);
  expect(screen.getByText(new RegExp(counted(r.reach.lead, 37).replace('.', '\\.')))).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a locked row says «لا يمكن إيقافه»; manual rows have no switch; timing stays text', async () => {
  await renderWithQuery(<NotificationCatalogue />);
  expect(await screen.findByText(r.intro)).toBeTruthy();
  await openAudience(c.audience.staff);
  expect(screen.getByText(c.entries.reminder_failed.name)).toBeTruthy();
  expect(screen.getAllByText(r.locked)).toHaveLength(1);
  await openAudience(c.states.manual);
  expect(screen.getByText(c.entries.inbox_templates.name)).toBeTruthy();
  expect(screen.queryAllByRole('switch')).toHaveLength(0);
  expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
});

test('a refused save (422 locked) is said under its row and the switch stays where it was', async () => {
  const { ApiError } = jest.requireActual<typeof import('@/core/lib/http/api')>('@/core/lib/http/api');
  mockApiSend.mockRejectedValue(new ApiError(422, { message: 'locked' }));
  await renderWithQuery(<NotificationCatalogue />);
  await openAudience(c.audience.teacher);
  await fireEvent(await switchOf('teacher_lesson_reminder'), 'valueChange', false);
  expect(await screen.findByText(r.errors.locked)).toBeTruthy();
  expect((await switchOf('teacher_lesson_reminder')).props.accessibilityState).toMatchObject({ checked: true });
});

test('403 says the permission is missing', async () => {
  const { ApiError } = jest.requireActual<typeof import('@/core/lib/http/api')>('@/core/lib/http/api');
  mockApiSend.mockRejectedValue(new ApiError(403, { message: 'forbidden' }));
  await renderWithQuery(<NotificationCatalogue />);
  await openAudience(c.audience.teacher);
  await fireEvent(await switchOf('teacher_lesson_reminder'), 'valueChange', false);
  expect(await screen.findByText(r.errors.forbidden)).toBeTruthy();
});
