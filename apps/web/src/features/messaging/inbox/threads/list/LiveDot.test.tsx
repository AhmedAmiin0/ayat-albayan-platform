import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { inboxLive } from '@/features/messaging/inbox/api/live';
import { LiveDot } from './LiveDot';

afterEach(() => inboxLive.setLive(false));

describe('LiveDot (docs/44 K2)', () => {
  it('red and «غير متصل» while the channel is down; green and «متصل» once SUBSCRIBED', () => {
    render(<LiveDot />);
    const dot = screen.getByTestId('live-dot');
    expect(dot.dataset.state).toBe('off');
    expect(screen.getByRole('status').textContent).toBe(t.inbox.liveOff);
    expect(dot.querySelector('.bg-danger')).not.toBeNull();
    act(() => inboxLive.setLive(true));
    expect(dot.dataset.state).toBe('on');
    expect(screen.getByRole('status').textContent).toBe(t.inbox.liveOn);
    expect(dot.querySelector('.bg-ok')).not.toBeNull();
    expect(dot.getAttribute('title')).toBe(t.inbox.liveOn);
  });
});
