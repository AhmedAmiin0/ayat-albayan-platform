import { Linking } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { copyText, downloadFile, downloadProblem } from './chat-tools';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const openURL = jest.spyOn(Linking, 'openURL');

beforeEach(() => openURL.mockReset().mockResolvedValue(true));

test('copyText shows the exact text on the sheet (this APK has no clipboard module)', () => {
  const show = jest.fn();
  copyText({ title: 'عنوان', text: 'نص كامل' }, show);
  expect(show).toHaveBeenCalledWith({ title: 'عنوان', text: 'نص كامل' });
});

test('downloadFile asks a fresh ?download=1 URL every time and opens each', async () => {
  mockApiFetch.mockResolvedValueOnce({ url: 'https://s.test/1' }).mockResolvedValueOnce({ url: 'https://s.test/2' });
  await downloadFile({ phone: '+966552147730', messageId: 'f1' });
  await downloadFile({ phone: '+966552147730', messageId: 'f1' });
  expect(mockApiFetch).toHaveBeenNthCalledWith(2, '/threads/%2B966552147730/messages/f1/file?download=1');
  expect(openURL.mock.calls).toEqual([['https://s.test/1'], ['https://s.test/2']]);
});

test('downloadProblem: 403 «غير مسموح», 410 gone, anything else try again', () => {
  expect(downloadProblem(new ApiError(403, { code: 'media_forbidden' }))).toBe(t.inbox.mediaNotAllowed);
  expect(downloadProblem(new ApiError(410, { code: 'media_expired' }))).toBe(t.inbox.mediaExpired);
  expect(downloadProblem(new Error('offline'))).toBe(t.inbox.download.failed);
});
