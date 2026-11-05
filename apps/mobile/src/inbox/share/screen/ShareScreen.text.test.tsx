import { fireEvent, screen } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';
import { t } from '@/core/lib/i18n/i18n';
import { getComposerText, setComposerText } from '@/inbox/composer/draft-store';
import { sendChatFile } from '@/inbox/composer/send-file';
import { answerThreads, FAMILY, renderShare, TEACHER } from './share-testing';
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
const LINK = 'https://example.test/lesson-notes';

beforeEach(() => {
  jest.clearAllMocks();
  setComposerText(FAMILY, '');
  jest.mocked(Sharing.getSharedPayloads).mockReturnValue([{ value: LINK, shareType: 'url' }]);
});

async function pickFamily() {
  await fireEvent.press(await screen.findByRole('checkbox', { name: 'أم سارة' }));
}

test('text: nothing happens until a chat is picked and the button pressed; then box + chat', async () => {
  await renderShare();
  expect(await screen.findByText(LINK)).toBeTruthy();
  await fireEvent.press(screen.getByText(s.pickHint));
  expect(mockReplace).not.toHaveBeenCalled();
  await pickFamily();
  expect(getComposerText(FAMILY)).toBe('');
  await fireEvent.press(screen.getByText(s.openChat));
  expect(getComposerText(FAMILY)).toBe(LINK);
  expect(mockReplace).toHaveBeenCalledWith('/inbox/thread/%2B201000000001');
  expect(sendChatFile).not.toHaveBeenCalled();
  expect(Sharing.getResolvedSharedPayloadsAsync).not.toHaveBeenCalled();
});

test('her unsent draft stays: the shared text goes after it', async () => {
  setComposerText(FAMILY, 'السلام عليكم');
  await renderShare();
  await pickFamily();
  await fireEvent.press(screen.getByText(s.openChat));
  expect(getComposerText(FAMILY)).toBe(`السلام عليكم\n${LINK}`);
});

test('the sales tree opens its own chat route', async () => {
  await renderShare({ base: '/sales' });
  await pickFamily();
  await fireEvent.press(screen.getByText(s.openChat));
  expect(mockReplace).toHaveBeenCalledWith('/sales/inbox/thread/%2B201000000001');
});

test('a teacher shares text into her families’ chats; her own academy chat is not offered', async () => {
  await renderShare({ mode: TEACHER });
  await pickFamily();
  expect(screen.queryByRole('checkbox', { name: 'المعلمة نور' })).toBeNull();
  await fireEvent.press(screen.getByText(s.openChat));
  expect(mockReplace).toHaveBeenCalledWith('/teacher/chats/%2B201000000001');
  expect(screen.getByRole('checkbox', { name: 'أبو خالد' })).toBeTruthy();
});

test('an empty share says so and keeps the button off', async () => {
  jest.mocked(Sharing.getSharedPayloads).mockReturnValue([]);
  await renderShare();
  expect(await screen.findByText(s.empty)).toBeTruthy();
  await pickFamily();
  await fireEvent.press(screen.getByText(s.openChat));
  expect(mockReplace).not.toHaveBeenCalled();
});

test('a share that cannot be read says so, with «رجوع»', async () => {
  jest.mocked(Sharing.getSharedPayloads).mockImplementation(() => {
    throw new Error('gone');
  });
  await renderShare();
  expect(await screen.findByText(s.readFailed)).toBeTruthy();
  await fireEvent.press(screen.getByText(t.common.back));
  expect(mockReplace).toHaveBeenCalledWith('/inbox');
  expect(Sharing.clearSharedPayloads).toHaveBeenCalled();
});

test('answerThreads only answers the chats list', () => {
  expect(answerThreads('/settings/public')).toBeNull();
});
