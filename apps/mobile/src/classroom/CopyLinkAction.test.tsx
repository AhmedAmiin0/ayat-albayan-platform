import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { CopyLinkAction } from './CopyLinkAction';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

let share: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
});
const press = () => fireEvent.press(screen.getByRole('button', { name: t.classroom.copyLink }));

test('a tap fetches a fresh URL (POST) and hands exactly it to the share sheet', async () => {
  mockApiSend.mockResolvedValue({ url: 'https://app/join/abc', expires_at: 'x' });
  await renderWithQuery(<CopyLinkAction lessonId="l-1" />);
  await press();
  expect(await screen.findByText(t.classroom.linkWindow)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-1/join-link/url');
  expect(share).toHaveBeenCalledWith({ message: 'https://app/join/abc' });
  await press();
  expect(mockApiSend).toHaveBeenCalledTimes(2);
});

test('an API refusal shows its message and opens no sheet', async () => {
  mockApiSend.mockRejectedValue(new ApiError(403, null));
  await renderWithQuery(<CopyLinkAction lessonId="l-1" />);
  await press();
  expect(await screen.findByText(t.mobileClassroom.linkForbidden)).toBeTruthy();
  expect(share).not.toHaveBeenCalled();
});

test('a share sheet that fails says so', async () => {
  mockApiSend.mockResolvedValue({ url: 'u', expires_at: 'x' });
  share.mockRejectedValue(new Error('no sheet'));
  await renderWithQuery(<CopyLinkAction lessonId="l-1" />);
  await press();
  expect(await screen.findByText(t.mobileClassroom.linkShareFailed)).toBeTruthy();
});

test('a dismissed share sheet is not a success: no «link window» note', async () => {
  mockApiSend.mockResolvedValue({ url: 'u', expires_at: 'x' });
  share.mockResolvedValue({ action: Share.dismissedAction });
  await renderWithQuery(<CopyLinkAction lessonId="l-1" />);
  await press();
  await waitFor(() => expect(share).toHaveBeenCalled());
  expect(screen.queryByText(t.classroom.linkWindow)).toBeNull();
  expect(screen.queryByText(t.mobileClassroom.linkShareFailed)).toBeNull();
});
