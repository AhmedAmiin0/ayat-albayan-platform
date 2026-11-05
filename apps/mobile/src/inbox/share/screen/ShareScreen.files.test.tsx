import { act, fireEvent, screen } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';
import { t } from '@/core/lib/i18n/i18n';
import { ChatFileError, sendChatFile } from '@/inbox/composer/send-file';
import { renderShare, resolvedPdf, TEACHER } from './share-testing';
import type * as ShareTestingModule from './share-testing';

type ShareTesting = typeof ShareTestingModule;

jest.mock('expo-sharing', () => ({
  getSharedPayloads: jest.fn(),
  getResolvedSharedPayloadsAsync: jest.fn(),
  clearSharedPayloads: jest.fn(),
}));
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async (path: string) => jest.requireActual<ShareTesting>('./share-testing').answerThreads(path),
}));
jest.mock('@/inbox/composer/send-file', () => ({
  ...jest.requireActual('@/inbox/composer/send-file'),
  sendChatFile: jest.fn(),
}));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (h: unknown) => mockReplace(h), back: jest.fn(), canGoBack: () => false },
}));

const s = t.inbox.share;
const send = jest.mocked(sendChatFile);
const share = (...names: string[]) => {
  jest.mocked(Sharing.getSharedPayloads).mockReturnValue(
    names.map((n) => ({ value: `content://provider/${n}`, shareType: 'file' })),
  );
  const resolved = names.map(resolvedPdf);
  jest.mocked(Sharing.getResolvedSharedPayloadsAsync).mockResolvedValue(resolved as never);
};

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(async () => ({
    arrayBuffer: async () => new ArrayBuffer(2048),
    blob: async () => ({ size: 2048 }),
  }));
  send.mockImplementation(async ({ id }) => ({ id: `row-${id}`, phone_e164: '+201000000001' }) as never);
});

async function sendToFamily() {
  await fireEvent.press(await screen.findByRole('checkbox', { name: 'أم سارة' }));
  await act(async () => {
    await fireEvent.press(screen.getByText(s.sendTo.replace('{name}', 'أم سارة')));
  });
}

test('files: each sent once, in order, to the picked chat; then the chat opens', async () => {
  share('a.pdf', 'b.pdf');
  await renderShare();
  expect(await screen.findByText(`${t.inbox.share.files.two} · a.pdf`)).toBeTruthy();
  expect(send).not.toHaveBeenCalled();
  await sendToFamily();
  expect(send.mock.calls.map(([i]) => [i.phone, i.file.filename])).toEqual([
    ['+201000000001', 'a.pdf'],
    ['+201000000001', 'b.pdf'],
  ]);
  expect(mockReplace).toHaveBeenCalledWith('/inbox/thread/%2B201000000001');
});

test('a partial failure stays: each failed file with its reason; retry sends only it, same id', async () => {
  share('a.pdf', 'b.pdf');
  send
    .mockResolvedValueOnce({ id: 'row-a', phone_e164: '+201000000001' } as never)
    .mockRejectedValueOnce(new ChatFileError('file_too_large'));
  await renderShare();
  await sendToFamily();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(screen.getByText(s.someFailed)).toBeTruthy();
  expect(screen.getByText(`b.pdf: ${t.inbox.error.file_too_large}`)).toBeTruthy();
  const failedId = send.mock.calls[1]?.[0].id;
  await act(async () => {
    await fireEvent.press(screen.getByText(s.retry));
  });
  expect(send).toHaveBeenCalledTimes(3);
  expect(send.mock.calls[2]?.[0].id).toBe(failedId);
  expect(mockReplace).toHaveBeenCalledWith('/inbox/thread/%2B201000000001');
});

test('«فتح المحادثة» after a failure opens the chat it went to', async () => {
  share('a.pdf');
  send.mockRejectedValueOnce(new ChatFileError('file_upload'));
  await renderShare();
  await sendToFamily();
  await fireEvent.press(screen.getByText(s.openChat));
  expect(mockReplace).toHaveBeenCalledWith('/inbox/thread/%2B201000000001');
});

test('a teacher sharing a file sees why, and the button stays off', async () => {
  share('a.pdf');
  await renderShare({ mode: TEACHER });
  expect(await screen.findByText(s.teacherFiles)).toBeTruthy();
  await sendToFamily();
  expect(send).not.toHaveBeenCalled();
});

test('more than ten files: the limit is named and nothing is sent', async () => {
  share(...Array.from({ length: 11 }, (_, i) => `f${String(i)}.pdf`));
  await renderShare();
  expect(await screen.findByText(s.tooMany.replace('{max}', '10'))).toBeTruthy();
});
