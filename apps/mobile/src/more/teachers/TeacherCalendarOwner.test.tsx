import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { seedFullAccess } from '@/test/staff-me';
import { TeacherCalendarOwner } from './TeacherCalendarOwner';

// «تقويم المعلم» (docs/24 «نقل تقويم معلم إلى المنصة»): admin only, GET/PUT calendar-owner.

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (mockMethod: string, mockPath: string, mockBody?: unknown) => mockApiSend(mockMethod, mockPath, mockBody),
}));

const T = t.googleSync.teacherCalendar;
const PATH = '/admin/google/teachers/t1/calendar-owner';
const VIEW = { teacher_id: 't1', owner: 'script', changed_at: null, managed: 4, script_event_present: 2 };

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  mockApiFetch.mockResolvedValue(VIEW);
});

test('an admin sees the two sources, the warning and the sync status', async () => {
  await renderWithQuery(<TeacherCalendarOwner teacherId="t1" />);
  const script = await screen.findByRole('radio', { name: T.script });
  expect(script.props.accessibilityState).toMatchObject({ checked: true });
  expect(screen.getByRole('radio', { name: T.platform }).props.accessibilityState).toMatchObject({ checked: false });
  expect(screen.getByText(T.warning)).toBeTruthy();
  expect(screen.getByText(T.managed.replace('{n}', '4'))).toBeTruthy();
  expect(screen.getByText(T.scriptPresent.replace('{n}', '2'))).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(PATH);
});

test('«من المنصة» sends the owner and shows the saved note', async () => {
  mockApiSend.mockResolvedValue({ ...VIEW, owner: 'platform' });
  await renderWithQuery(<TeacherCalendarOwner teacherId="t1" />);
  await fireEvent.press(await screen.findByRole('radio', { name: T.platform }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PUT', PATH, { owner: 'platform' }));
  expect(await screen.findByText(T.saved)).toBeTruthy();
  expect(screen.getByRole('radio', { name: T.platform }).props.accessibilityState).toMatchObject({ checked: true });
});

test('hidden for anyone but a base-role admin, with no request', async () => {
  const client = createTestQueryClient({ meFromApi: true });
  seedFullAccess(client, 'assistant');
  await renderWithQuery(<TeacherCalendarOwner teacherId="t1" />, client);
  expect(screen.queryByText(T.title)).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalled();
});
