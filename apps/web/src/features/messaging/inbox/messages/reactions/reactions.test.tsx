import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ChatActionsProvider } from '../../shared/ChatActionsProvider';
import { message, PHONE, thread } from '../../testing/inbox-fixture';
import { renderWithClient } from '../../testing/test-utils';
import { MessageLog } from '../components/MessageLog';
import { emojiLabel } from './ReactionRow';

// «تفاعل» on the web (owner 2026-10-27): the six emoji on top of the bubble's menu, the pill under the
// bubble. The API is a mock: nothing reaches WhatsApp.
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const base = { phone: PHONE, hasMore: false, loadingOlder: false, onOlder: vi.fn(), waitingKeys: new Set<string>() };
const now = new Date().toISOString();
const TEXT = message({ id: 'm1', direction: 'inbound', body: 'السلام عليكم', replyable: true, created_at: now });
const PATH = `/threads/${encodeURIComponent(PHONE)}/messages/m1/reaction`;

function chat(m: typeof TEXT, reactable = true) {
  renderWithClient(
    <ChatActionsProvider thread={thread({ reactable, last_inbound_at: now })} enabled>
      <MessageLog {...base} messages={[m]} />
    </ChatActionsProvider>,
  );
}
const openMenu = () => fireEvent.click(screen.getByRole('button', { name: t.inbox.reply.menu }));

beforeEach(() => {
  apiSend.mockReset().mockImplementation(async (_m: string, _p: string, body: { emoji: string | null }) => ({
    message: { ...TEXT, reactions: { theirs: null, ours: body.emoji, ours_by: 'هبة' } },
    status: 'sent',
    error_code: null,
    error_text: null,
  }));
});

describe('the bubble menu’s emoji row', () => {
  it('shows the six emoji first, with spoken names; a click reacts once and closes the menu', async () => {
    chat(TEXT);
    openMenu();
    const row = within(screen.getByRole('group', { name: t.inbox.reactions.bar }));
    expect(row.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emojiLabel));
    fireEvent.click(row.getByRole('button', { name: emojiLabel('❤️') }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    expect(apiSend).toHaveBeenCalledWith('PUT', PATH, { emoji: '❤️', clientRequestId: expect.any(String) });
    expect(screen.queryByRole('group', { name: t.inbox.reactions.bar })).toBeNull();
  });

  it('our current emoji is pressed, and a click on it removes it', async () => {
    chat({ ...TEXT, reactions: { theirs: null, ours: '👍', ours_by: 'هبة' } });
    openMenu();
    const ours = screen.getByRole('button', { name: emojiLabel('👍') });
    expect(ours.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(ours);
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', PATH, { emoji: null, clientRequestId: expect.any(String) }));
  });

  it('no row on a line that cannot react (the CRM line)', () => {
    chat(TEXT, false);
    openMenu();
    expect(screen.queryByRole('group', { name: t.inbox.reactions.bar })).toBeNull();
  });

  it('a refused reaction says so', async () => {
    apiSend.mockRejectedValue(new Error('offline'));
    chat(TEXT);
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: emojiLabel('😂') }));
    expect(await screen.findByText(t.inbox.reactions.failed)).toBeTruthy();
  });
});

describe('the pill', () => {
  it('shows theirs and ours and names who reacted', () => {
    chat({ ...TEXT, reactions: { theirs: '❤️', ours: '❤️', ours_by: 'هبة' } });
    const pill = screen.getByTestId('reaction-pill-m1');
    expect(pill.textContent).toBe('❤️ 2');
    expect(pill.getAttribute('title')).toContain('هبة');
  });

  it('is absent without a reaction', () => {
    chat(TEXT);
    expect(screen.queryByTestId('reaction-pill-m1')).toBeNull();
  });
});
