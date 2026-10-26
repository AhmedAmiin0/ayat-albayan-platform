import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { profile } from '@/students/shared/test-data';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { StudentFileSections } from './StudentFileSections';

const mockApiFetch = jest.fn();
const mockPush = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: (mockHref: string) => mockPush(mockHref) } }));

const S = t.mobileStudentFile;
const serve = (permissions: string[]) => mockApiFetch.mockResolvedValue({ permissions });

beforeEach(() => {
  mockApiFetch.mockReset();
  mockPush.mockReset();
});

test('all three sections for a role that holds every permission; buttons open their screens', async () => {
  serve(['recordings.read', 'payments.read', 'invoices.read', 'classroom.links']);
  await renderWithQuery(<StudentFileSections student={profile} />, createTestQueryClient({ meFromApi: true }));
  await fireEvent.press(await screen.findByText(S.recordings.button));
  expect(mockPush).toHaveBeenCalledWith(`/students/recordings/${profile.id}`);
  await fireEvent.press(screen.getByText(S.money.button));
  expect(mockPush).toHaveBeenCalledWith(`/students/money/${profile.id}`);
  expect(screen.getByText(S.joinLink.create)).toBeTruthy();
});

test('controls the role lacks are hidden once /auth/me answers', async () => {
  serve(['payments.read']);
  await renderWithQuery(<StudentFileSections student={profile} />, createTestQueryClient({ meFromApi: true }));
  // D6: nothing shows while /auth/me loads, so wait for what the role holds, then check the rest.
  expect(await screen.findByText(S.money.button)).toBeTruthy();
  expect(screen.queryByText(S.recordings.button)).toBeNull();
  expect(screen.queryByText(S.joinLink.create)).toBeNull();
});

test('student_channels.monitor opens the read-only teacher–family channel (docs/31 §2); without it, no button', async () => {
  serve(['student_channels.monitor']);
  await renderWithQuery(<StudentFileSections student={profile} />, createTestQueryClient({ meFromApi: true }));
  await fireEvent.press(await screen.findByText(t.studentChannel.monitorTitle));
  expect(mockPush).toHaveBeenCalledWith(`/students/channel/${profile.id}`);
});

test('without student_channels.monitor the channel button is hidden', async () => {
  serve(['payments.read']);
  await renderWithQuery(<StudentFileSections student={profile} />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByText(S.money.button)).toBeTruthy();
  expect(screen.queryByText(t.studentChannel.monitorTitle)).toBeNull();
});
