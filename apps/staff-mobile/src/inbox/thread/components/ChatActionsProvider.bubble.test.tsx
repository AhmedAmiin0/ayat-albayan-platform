import { act, screen } from '@testing-library/react-native';
import { useContext } from 'react';
import { renderWithQuery } from '@/test/query';
import { AppText } from '@ab/mobile-kit';
import { inbound, PHONE, thread } from '@/inbox/shared/thread-fixtures';
import {
  BubbleActionsContext,
  type BubbleChatActions,
  ChatActionsContext,
  type ChatActions,
} from '@/inbox/thread/hooks/chat-actions';
import { ThreadModeProvider } from '@/inbox/thread/hooks/thread-mode';
import { ChatActionsProvider } from './ChatActionsProvider';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
mockApi.onRead(async () => ({ id: 'u1', role: 'admin', permissions: [] }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const seen: { bubble: BubbleChatActions[]; full: ChatActions[] } = { bubble: [], full: [] };
function Probe() {
  seen.bubble.push(useContext(BubbleActionsContext));
  return null;
}
function Composer() {
  const full = useContext(ChatActionsContext);
  seen.full.push(full);
  return <AppText>{full.reply ? 'رد' : 'لا رد'}</AppText>;
}

// Picking a reply redraws the composer, not every bubble.
test("picking a reply or showing a notice leaves the bubbles' slice unchanged", async () => {
  await renderWithQuery(
    <ThreadModeProvider value={{ kind: 'admin' }}>
      <ChatActionsProvider phone={PHONE} thread={thread}>
        <Probe />
        <Composer />
      </ChatActionsProvider>
    </ThreadModeProvider>,
  );
  const drawn = seen.bubble.length;
  const first = seen.full[0];
  if (!first) throw new Error('no provider value');
  await act(async () => first.setReply(inbound));
  await act(async () => first.say({ text: 'تم' }));
  expect(screen.getByText('رد')).toBeTruthy();
  expect(seen.bubble.length).toBe(drawn);
  expect(seen.full.at(-1)?.reply).toBe(inbound);
});
