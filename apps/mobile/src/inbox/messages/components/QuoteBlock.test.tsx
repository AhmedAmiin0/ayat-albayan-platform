import { type MessageQuote, type ReplyQuote, UNAVAILABLE_QUOTE } from '@ab/shared';
import { act, fireEvent, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ChatActionsProvider } from '@/inbox/thread/components/ChatActionsProvider';
import { type ThreadMode, ThreadModeProvider } from '@/inbox/thread/hooks/thread-mode';
import { pdfPageQuery } from '@/inbox/messages/hooks/thread-file';
import { PATH, pageUrl, pdfPage, pdfPath, SIGNED, signed } from '@/inbox/messages/photo/photo-test-kit';
import { PHONE, thread } from '@/inbox/shared/thread-fixtures';
import { QuoteBlock } from './QuoteBlock';

// The quote on top of a bubble, as WhatsApp draws it (owner 2026-10-31): who wrote it, the snippet
// with a file's icon, a photo's or PDF's thumb, a tap to the original, «رسالة غير متاحة».
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const quote = (fields: Partial<MessageQuote> = {}): MessageQuote => ({
  id: 'p1',
  direction: 'inbound',
  body: null,
  media_mime: 'image/jpeg',
  template_key: null,
  sender_name: null,
  ...fields,
});
const calls = (path: string) => mockApiFetch.mock.calls.filter(([p]) => p === path).length;

function show(q: ReplyQuote, opts: { onJump?: (id: string) => void; mode?: ThreadMode } = {}) {
  const ui: ReactElement = (
    <ThreadModeProvider value={opts.mode ?? { kind: 'admin' }}>
      <ChatActionsProvider phone={PHONE} thread={thread}>
        <QuoteBlock quote={q} phone={PHONE} onJump={opts.onJump} />
      </ChatActionsProvider>
    </ThreadModeProvider>
  );
  return renderWithQuery(ui);
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation((path: string) =>
    Promise.resolve(path === PATH ? signed() : null),
  );
});

test("theirs: the chat's name, the photo's icon and kind, and its thumb at the end", async () => {
  await show(quote());
  expect(screen.getByText(thread.display_name ?? '')).toBeTruthy();
  expect(screen.getByText(`📷 ${t.inbox.media.image}`)).toBeTruthy();
  expect((await screen.findByTestId('quote-thumb-p1')).props.source).toEqual({ uri: SIGNED });
});

test('ours: «أنت» with no staff name, else who sent it; a caption is the line', async () => {
  await show(quote({ id: 'm1', direction: 'outbound', body: 'الواجب', media_mime: null }));
  expect(screen.getByText(t.inbox.reply.you)).toBeTruthy();
  expect(screen.getByText('الواجب')).toBeTruthy();
});

test('a PDF: its icon and «ملف PDF»; page 1 only from the cache (the quote never asks for it)', async () => {
  const { client } = await show(quote({ id: 'd1', media_mime: 'application/pdf' }));
  expect(screen.getByText(`📄 ${t.inbox.media.pdf}`)).toBeTruthy();
  expect(calls(pdfPath(1))).toBe(0);
  expect(screen.queryByTestId('quote-thumb-d1')).toBeNull();
  await act(async () => {
    client.setQueryData(pdfPageQuery(PHONE, 'd1', 1).queryKey, pdfPage(1));
  });
  expect(screen.getByTestId('quote-thumb-d1').props.source).toEqual({ uri: pageUrl(1) });
});

test('a teacher asks for no file: the icon only', async () => {
  await show(quote(), { mode: { kind: 'teacher', teacherId: 't1' } });
  expect(screen.getByText(`📷 ${t.inbox.media.image}`)).toBeTruthy();
  expect(calls(PATH)).toBe(0);
  expect(screen.queryByTestId('quote-thumb-p1')).toBeNull();
});

test('a tap jumps to the original', async () => {
  const onJump = jest.fn();
  await show(quote({ media_mime: null, body: 'متى الحلقة؟' }), { onJump });
  await fireEvent.press(screen.getByTestId('quote-p1'));
  expect(onJump).toHaveBeenCalledWith('p1');
});

test('unavailable: «رسالة غير متاحة», greyed, nothing to tap', async () => {
  await show(UNAVAILABLE_QUOTE, { onJump: jest.fn() });
  const box = screen.getByTestId('quote-unavailable');
  expect(box.props.accessibilityRole).toBeUndefined();
  expect(box.props.onPress).toBeUndefined();
  expect(screen.getByText(t.inbox.reply.unavailable)).toBeTruthy();
});
