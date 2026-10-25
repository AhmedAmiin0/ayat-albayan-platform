import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { dayLabel } from '@/calendar/week';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { AssistantHomeScreen } from './AssistantHomeScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

// 16:00 Riyadh on 2026-10-01: the lesson below is running.
const row = (over: object) => ({
  lesson_id: 'l1',
  starts_at: '2026-10-01T13:00:00.000Z',
  ends_at: '2026-10-01T13:45:00.000Z',
  status: 'confirmed',
  teacher_name: 'أبرار',
  student_names: ['يوسف'],
  ...over,
});
const all = () => true;

beforeEach(() => {
  jest.clearAllMocks();
  fakeNow(new Date('2026-10-01T13:10:00Z'));
});
afterEach(() => jest.useRealTimers());

test('today first: the lessons they assist (open ones only) for the Riyadh day', async () => {
  mockApiFetch.mockResolvedValue([row({}), row({ lesson_id: 'l2', status: 'cancelled_by_admin', student_names: ['جنى'] })]);
  await renderWithQuery(<AssistantHomeScreen can={all} />);
  expect(screen.getByRole('header', { name: t.mobileRoles.lessonsTitle })).toBeTruthy();
  expect(await screen.findByText(`${t.classroom.assistants.student} يوسف`)).toBeTruthy();
  expect(screen.queryByText(`${t.classroom.assistants.student} جنى`)).toBeNull();
  expect(mockApiFetch).toHaveBeenCalledWith(
    '/assistants/me/lessons?from=2026-09-30T21%3A00%3A00.000Z&to=2026-10-01T21%3A00%3A00.000Z',
  );
});

test('«ادخل الحلقة» asks the API for the room, then opens the classroom in the browser', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  mockApiFetch.mockResolvedValue([row({})]);
  mockApiSend.mockResolvedValue({});
  await renderWithQuery(<AssistantHomeScreen can={all} />);
  await fireEvent.press(await screen.findByRole('button', { name: t.classroom.enter }));
  await waitFor(() => expect(openURL).toHaveBeenCalledWith('https://app.ayatalbayan.com/classroom/l1'));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l1/room/join');
  openURL.mockRestore();
});

test('the next day reads that day, with its own empty line', async () => {
  mockApiFetch.mockResolvedValue([]);
  await renderWithQuery(<AssistantHomeScreen can={all} />);
  expect(await screen.findByText(t.classroom.assistants.homeEmpty)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.schedule.nextDay }));
  expect(screen.getByText(dayLabel('2026-10-02'))).toBeTruthy();
  expect(await screen.findByText(t.mobileRoles.dayEmpty)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenLastCalledWith(expect.stringContaining('from=2026-10-01T21%3A00%3A00.000Z'));
});

test('«اجتماعات داخلية» opens the meetings with meetings.read, and is absent without it', async () => {
  mockApiFetch.mockResolvedValue([]);
  const first = await renderWithQuery(<AssistantHomeScreen can={all} />);
  await fireEvent.press(screen.getByRole('button', { name: t.mobileClassroom.meetingsRow }));
  expect(router.push).toHaveBeenCalledWith('/assistant/lessons/meetings');
  await first.unmount();
  await renderWithQuery(<AssistantHomeScreen can={(p) => p !== 'meetings.read'} />);
  expect(screen.queryByRole('button', { name: t.mobileClassroom.meetingsRow })).toBeNull();
});
