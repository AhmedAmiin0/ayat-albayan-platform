import { ApiError } from '@ab/client-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChannelBubble } from '@ab/web-kit/components/channel/ChannelBubble';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { msg, showBubble } from './bubble.testing';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const a = t.studentChannel.actions;
const menu = () => screen.queryByRole('button', { name: a.menu });

afterEach(() => apiSend.mockReset());

describe('channel bubble: offered only where the API accepts it', () => {
  it('a read-only seat (the owning assistant on a closed chat) is offered nothing', () => {
    showBubble(msg(1), 'sales', 'read');
    expect(menu()).toBeNull();
  });

  it('the offers follow the thread\'s ticking clock: «تعديل» goes once 15 minutes pass', () => {
    const now = new Date();
    const m = msg(14);
    const bubble = (at: Date) => (
      <QueryClientProvider client={new QueryClient()}>
        <ol>
          <ChannelBubble message={m} tz="Asia/Riyadh" refs={{ audience: 'teacher', studentId: 's1' }} now={at} mode="write" />
        </ol>
      </QueryClientProvider>
    );
    const view = render(bubble(now));
    fireEvent.click(screen.getByRole('button', { name: a.menu }));
    expect(screen.getByRole('button', { name: a.edit })).toBeTruthy();
    view.rerender(bubble(new Date(now.getTime() + 2 * 60_000)));
    expect(screen.queryByRole('button', { name: a.edit })).toBeNull();
    expect(screen.getByRole('button', { name: a.deleteForAll })).toBeTruthy();
  });

  it.each(['channel_read_only', 'channel_not_open'] as const)('the refusal %s is said in its own words', async (code) => {
    apiSend.mockRejectedValue(new ApiError(code === 'channel_read_only' ? 403 : 409, { code }));
    showBubble(msg(1), 'portal');
    fireEvent.click(screen.getByRole('button', { name: a.menu }));
    fireEvent.click(screen.getByRole('button', { name: a.deleteForAll }));
    fireEvent.click(screen.getByRole('button', { name: a.deleteConfirm }));
    expect(await screen.findByText(a.errors[code])).toBeTruthy();
  });

  it('Esc in the edit box and in the menu closes only them, never the panel around', () => {
    const outside = vi.fn();
    document.addEventListener('keydown', outside);
    showBubble(msg(1));
    fireEvent.click(screen.getByRole('button', { name: a.menu }));
    fireEvent.keyDown(screen.getByRole('button', { name: a.edit }), { key: 'Escape' });
    expect(screen.queryByRole('button', { name: a.edit })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: a.menu }));
    fireEvent.click(screen.getByRole('button', { name: a.edit }));
    fireEvent.keyDown(screen.getByLabelText(a.editTitle), { key: 'Escape' });
    expect(screen.queryByLabelText(a.editTitle)).toBeNull();
    expect(outside).not.toHaveBeenCalled();
    document.removeEventListener('keydown', outside);
  });
});
