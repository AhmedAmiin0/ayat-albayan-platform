import type { ReplyLesson, ThreadDetail } from '@ab/shared';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { detail, message, PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { useHide } from '@/features/messaging/inbox/messages/hide/use-hide';
import { useReact } from '@/features/messaging/inbox/messages/reactions/use-react';
import { useReplyActions } from '@/features/messaging/inbox/messages/reply-actions/reply-actions-context';
import { ReplyActionsProvider } from '@/features/messaging/inbox/messages/reply-actions/ReplyActionsProvider';
import { ReplyConfirmButton } from '@/features/messaging/inbox/messages/reply-actions/ReplyConfirmButton';
import { MessageActions } from './MessageActions';

// docs/37 review 1: a bubble action inside the window around a search hit refreshes that window
// too (it sits outside the live chat's key on purpose).

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend, apiFetch: vi.fn() }));
vi.mock('@/features/people/auth', () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock('@/features/messaging/inbox/messages/reply-actions/RescheduleLessonDrawer', () => ({
  RescheduleLessonDrawer: ({ onMoved }: { onMoved: () => void }) => (
    <button type="button" onClick={onMoved}>
      moved
    </button>
  ),
}));

const WINDOW = ['thread-at', PHONE, 'b0000000-0000-4000-8000-000000000001'];
const M = message({ id: 'm1', body: 'السلام عليكم' });
const windowed = (): InfiniteData<ThreadDetail> => ({ pages: [detail([M])], pageParams: [null] });

/** The window's query as stale-marked by an invalidation. */
const refreshed = (client: QueryClient) => client.getQueryState(WINDOW)?.isInvalidated === true;

function mount(ui: React.ReactElement): QueryClient {
  const client = renderWithClient(ui);
  client.setQueryData(WINDOW, windowed());
  return client;
}

beforeEach(() => apiSend.mockResolvedValue({}));
afterEach(() => apiSend.mockReset());

function HideButton() {
  const { hide } = useHide(PHONE);
  return <button type="button" onClick={() => hide.mutate('m1')}>hide</button>;
}

function ReactButton() {
  const { mutate } = useReact(PHONE, vi.fn());
  return <button type="button" onClick={() => mutate({ message: M, emoji: '👍' })}>react</button>;
}

const LESSON = { id: 'l1' } as unknown as ReplyLesson;
function MoveButton() {
  const { reschedule } = useReplyActions();
  return <button type="button" onClick={() => reschedule('m1', LESSON)}>move</button>;
}

describe('bubble actions refresh an anchored window', () => {
  it('«حذف من المنصة» (useHide)', async () => {
    const client = mount(<HideButton />);
    fireEvent.click(screen.getByRole('button', { name: 'hide' }));
    await waitFor(() => expect(refreshed(client)).toBe(true));
  });

  it('«تفاعل» (useReact) patches the window at once', async () => {
    const reactions = { theirs: null, ours: '👍', ours_by: 'هبة' };
    apiSend.mockResolvedValue({ message: { ...M, reactions }, status: 'sent' });
    const client = mount(<ReactButton />);
    fireEvent.click(screen.getByRole('button', { name: 'react' }));
    await waitFor(() => {
      const data = client.getQueryData<InfiniteData<ThreadDetail>>(WINDOW);
      expect(data?.pages[0]?.messages[0]?.reactions?.ours).toBe('👍');
    });
  });

  it('«إعادة المحاولة» (MessageActions)', async () => {
    const failed = message({ id: 'm1', direction: 'outbound', status: 'failed', phone_e164: PHONE });
    const client = mount(<MessageActions message={failed} />);
    fireEvent.click(screen.getByRole('button', { name: t.messages.retry }));
    await waitFor(() => expect(refreshed(client)).toBe(true));
  });

  it('«تأكيد الحلقة» (ReplyConfirmButton)', async () => {
    const client = mount(<ReplyConfirmButton phone={PHONE} lessonId="l1" route="admin" label="x" />);
    fireEvent.click(screen.getByRole('button', { name: 'x' }));
    await waitFor(() => expect(refreshed(client)).toBe(true));
  });

  it('«تغيير الموعد» (ReplyActionsProvider)', async () => {
    const client = mount(
      <ReplyActionsProvider phone={PHONE} lessons={[]}>
        <MoveButton />
      </ReplyActionsProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'move' }));
    fireEvent.click(screen.getByRole('button', { name: 'moved' }));
    await waitFor(() => expect(refreshed(client)).toBe(true));
  });
});
