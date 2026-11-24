import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { channelMessage, channelPage } from '@ab/web-kit/components/channel/channel.fixtures';
import { showThread } from '@ab/web-kit/components/channel/thread.testing';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const c = t.studentChannel;
const DAY = 86_400_000;
const at = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
const teacher = { sender_role: 'teacher', sender_name: 'أ. فاطمة' } as const;

// 18:32 in Riyadh: «30 minutes ago» is always today, never across midnight.
beforeEach(() => vi.useFakeTimers({ now: new Date('2026-11-19T15:32:00Z'), toFake: ['Date'] }));
afterEach(() => {
  vi.useRealTimers();
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('ChannelThread rows (FamChatWebThread)', () => {
  it('day chips, the unread band at the first unread, one name line per run', async () => {
    const messages = [
      channelMessage({ id: 'y', body: 'أمسية', created_at: at(DAY + 60_000), ...teacher }),
      channelMessage({ id: 'a', body: 'الأولى', created_at: at(30 * 60_000), ...teacher }),
      channelMessage({ id: 'b', body: 'الثانية', created_at: at(20 * 60_000), ...teacher }),
      channelMessage({ id: 'c', body: 'الثالثة', created_at: at(10 * 60_000), ...teacher }),
    ];
    apiFetch.mockResolvedValue(channelPage({ messages, my_last_read_at: at(25 * 60_000) }));
    apiSend.mockResolvedValue({});
    showThread('portal');
    expect(await screen.findByText('الثالثة')).toBeTruthy();
    expect(screen.getByText(t.inbox.dayToday)).toBeTruthy();
    expect(screen.getByText(c.unread.replace('{n}', '2'))).toBeTruthy();
    // Yesterday's first, today's first and the one after the band each carry a name line.
    expect(screen.getAllByText('أ. فاطمة')).toHaveLength(3);
  });

  it('the closed card: the title, who talks here, and the current step', async () => {
    apiFetch.mockResolvedValue(channelPage({ open: false, messages: [], closed_reason: 'no_teacher' }));
    showThread('portal');
    expect(await screen.findByText(c.closedCard.title)).toBeTruthy();
    expect(screen.getByText(c.closedCard.steps.teacher).parentElement?.textContent).toContain(
      c.closedCard.current,
    );
    expect(screen.getByText(c.closedCard.done)).toBeTruthy();
    expect(screen.queryByLabelText(c.messageLabel)).toBeNull();
  });
});
