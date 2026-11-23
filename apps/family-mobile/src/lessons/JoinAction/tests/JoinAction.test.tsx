import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking, Vibration } from 'react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { lesson, student } from '@/portal/portal.fixtures';
import { JoinAction } from '@/lessons/JoinAction/JoinAction';

const mockSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...args: unknown[]) => mockSend(...args),
}));

const now = new Date('2026-11-15T15:25:00.000Z');
const show = (l: ReturnType<typeof lesson>) =>
  renderWithQuery(<JoinAction lesson={l} student={student()} now={now} />, freshQueryClient());

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  jest.spyOn(Vibration, 'vibrate').mockImplementation(() => undefined);
});

test('before the window: when it opens, no button', async () => {
  await show(lesson(now, 30));
  expect(screen.getByText(/يُتاح الدخول من/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.portal.join })).toBeNull();
});

test('a Meet lesson opens its own link, with a tap of vibration', async () => {
  const meet = lesson(now, 5, { way_in: 'external', meeting_url: 'https://meet.example/abc' });
  await show(meet);
  await fireEvent.press(screen.getByRole('button', { name: t.portal.join }));
  await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://meet.example/abc'));
  expect(Vibration.vibrate).toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('our classroom opens the signed room link in the browser', async () => {
  mockSend.mockResolvedValue({
    url: 'https://app.example/join/tok',
    expires_at: now.toISOString(),
  });
  await show(lesson(now, 5));
  await fireEvent.press(screen.getByRole('button', { name: t.portal.join }));
  await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://app.example/join/tok'));
  expect(mockSend.mock.calls[0]?.[1]).toMatch(/\/lessons\/.+\/room-link$/);
});

test('a refused link says so', async () => {
  mockSend.mockRejectedValue(new Error('no'));
  await show(lesson(now, 5));
  await fireEvent.press(screen.getByRole('button', { name: t.portal.join }));
  expect(await screen.findByText(t.portal.app.lesson.joinFailed)).toBeTruthy();
});
