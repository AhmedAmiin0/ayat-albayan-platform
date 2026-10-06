import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { renderWithQuery } from '@/test/query';
import { t } from '@/lib/i18n';
import { JoinLinkCard } from './JoinLinkCard';

const J = t.mobileStudentFile.joinLink;
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

let share: jest.SpyInstance;
beforeEach(() => {
  mockApiSend.mockReset();
  share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
});
afterEach(() => share.mockRestore());

test('asks before rotating, POSTs join-link, then shares the link with the student name', async () => {
  mockApiSend.mockResolvedValue({ url: 'https://app.test/s/abc' });
  await renderWithQuery(<JoinLinkCard studentId="s1" studentName="هدى" />);
  await fireEvent.press(screen.getByText(J.create));
  expect(mockApiSend).not.toHaveBeenCalled();
  expect(screen.getByText(J.confirm)).toBeTruthy();
  await fireEvent.press(screen.getByText(J.confirmAction));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/students/s1/join-link'));
  await waitFor(() => expect(share).toHaveBeenCalledWith({ message: J.share.replace('{name}', 'هدى').replace('{url}', 'https://app.test/s/abc') }));
});

test('a failed request says so and shares nothing', async () => {
  mockApiSend.mockRejectedValue(new Error('x'));
  await renderWithQuery(<JoinLinkCard studentId="s1" studentName="هدى" />);
  await fireEvent.press(screen.getByText(J.create));
  await fireEvent.press(screen.getByText(J.confirmAction));
  expect(await screen.findByText(J.error)).toBeTruthy();
  expect(share).not.toHaveBeenCalled();
});

test('cancel closes the question without a request', async () => {
  await renderWithQuery(<JoinLinkCard studentId="s1" studentName="هدى" />);
  await fireEvent.press(screen.getByText(J.create));
  await fireEvent.press(screen.getByText(t.common.cancel));
  expect(screen.getByText(J.create)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a dismissed or failed share keeps the new link on screen to copy or share again', async () => {
  mockApiSend.mockResolvedValue({ url: 'https://app.test/s/abc' });
  share.mockRejectedValueOnce(new Error('no share'));
  await renderWithQuery(<JoinLinkCard studentId="s1" studentName="هدى" />);
  await fireEvent.press(screen.getByText(J.create));
  await fireEvent.press(screen.getByText(J.confirmAction));
  expect(await screen.findByText(J.shareFailed)).toBeTruthy();
  expect(screen.queryByText(J.error)).toBeNull();
  expect(screen.getByText('https://app.test/s/abc')).toBeTruthy();
  await fireEvent.press(screen.getByText(J.shareAgain));
  await waitFor(() => expect(share).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByText(J.shareFailed)).toBeNull());
  expect(mockApiSend).toHaveBeenCalledTimes(1);
});
