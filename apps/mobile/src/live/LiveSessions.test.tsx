import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { jana, lesson } from '@/today/fixtures';
import { LiveSessions } from './LiveSessions';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

// 16:00 Riyadh (13:00Z) running; 16:30 (13:30Z) next; 19:00 (16:00Z) far.
const running = lesson({ id: 'run', status: 'confirmed' });
const next = lesson({
  id: 'next',
  status: 'scheduled',
  starts_at: '2026-10-01T13:30:00.000Z',
  ends_at: '2026-10-01T14:15:00.000Z',
  students: [jana],
  teacher: { id: 't2', display_name_ar: 'سارة', tz: 'Africa/Cairo' },
});
const far = lesson({ id: 'far', starts_at: '2026-10-01T16:00:00.000Z', ends_at: '2026-10-01T16:45:00.000Z' });
let openURL: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockApiSend.mockResolvedValue({});
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});
afterEach(() => jest.useRealTimers());

test('renders nothing when no lesson is live or soon', async () => {
  fakeNow(new Date('2026-10-01T10:00:00Z'));
  await renderWithQuery(<LiveSessions lessons={[running, far]} />);
  expect(screen.queryByText(t.live.title)).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
});

test('a started lesson has «مباشر الآن», a coming one «تبدأ الساعة 16:30», far ones are left out', async () => {
  fakeNow(new Date('2026-10-01T13:20:00Z'));
  await renderWithQuery(<LiveSessions lessons={[far, next, running]} showTeacher />);
  expect(screen.getByRole('header', { name: t.live.title })).toBeTruthy();
  expect(screen.getAllByText(t.live.now)).toHaveLength(1);
  expect(screen.getByText(t.live.startsAt.replace('{time}', '16:30'))).toBeTruthy();
  expect(screen.getByText(t.live.teacher.replace('{name}', 'سارة'))).toBeTruthy();
  expect(screen.getAllByRole('button', { name: t.classroom.enter })).toHaveLength(2);
  expect(screen.queryByText('19:00')).toBeNull();
});

test('the teacher line is for the admin only', async () => {
  fakeNow(new Date('2026-10-01T13:20:00Z'));
  await renderWithQuery(<LiveSessions lessons={[next]} />);
  expect(screen.queryByText(t.live.teacher.replace('{name}', 'سارة'))).toBeNull();
});

test('joining asks the API once, then opens the web classroom once', async () => {
  fakeNow(new Date('2026-10-01T13:20:00Z'));
  await renderWithQuery(<LiveSessions lessons={[running]} />);
  await fireEvent.press(screen.getByRole('button', { name: t.classroom.enter }));
  await waitFor(() => expect(openURL).toHaveBeenCalledTimes(1));
  expect(mockApiSend).toHaveBeenCalledTimes(1);
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/run/room/join');
});
