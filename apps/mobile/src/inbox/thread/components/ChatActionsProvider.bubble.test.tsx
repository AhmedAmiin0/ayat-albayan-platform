import { act, screen } from '@testing-library/react-native';
import { useContext } from 'react';
import { renderWithQuery } from '@/test/query';
import { AppText } from '@/core/ui/primitives/AppText';
import { inbound, PHONE, thread } from '../../shared/thread-fixtures';
import { BubbleActionsContext, type BubbleChatActions, ChatActionsContext, type ChatActions } from '../hooks/chat-actions';
import { ThreadModeProvider } from '../hooks/thread-mode';
import { ChatActionsProvider } from './ChatActionsProvider';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async () => ({ id: 'u1', role: 'admin', permissions: [] }),
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

// Owner 2026-10-27, «Avoid rerenders»: picking «رد» redraws the composer, not every bubble.
test('picking a reply or showing a notice leaves the bubbles\' slice unchanged', async () => {
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
