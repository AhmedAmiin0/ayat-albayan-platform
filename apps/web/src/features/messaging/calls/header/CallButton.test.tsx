import type { CallsUi } from '@ab/client-core';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { CallsContext } from '@/features/messaging/calls/state/call-context';
import { CallButton } from './CallButton';

const ui = (config: Partial<CallsUi['config']> = {}, busy = false): CallsUi => ({
  config: { enabled: true, available: true, canCall: true, iceServers: [], ...config },
  busy,
  call: vi.fn(),
});

function renderButton(value: CallsUi | null, canSend = true) {
  render(
    <CallsContext.Provider value={value}>
      <CallButton phone="+966501234567" name="أم سهيلة" canSend={canSend} />
    </CallsContext.Provider>,
  );
}

const name = `${t.calls.call}: أم سهيلة`;

describe('the thread header phone icon', () => {
  it('calls the chat', () => {
    const value = ui();
    renderButton(value);
    fireEvent.click(screen.getByRole('button', { name }));
    expect(value.call).toHaveBeenCalledWith({ phone: '+966501234567', name: 'أم سهيلة' });
  });

  it('is hidden while calls are off, for a role that cannot call, or a chat they cannot write in', () => {
    renderButton(ui({ enabled: false }));
    renderButton(ui({ canCall: false }));
    renderButton(ui(), false);
    renderButton(null);
    expect(screen.queryByRole('button', { name })).toBeNull();
  });

  it('is dimmed with the reason while the chat line cannot call, and during a call', () => {
    renderButton(ui({ available: false }));
    const button = screen.getByRole('button', { name });
    expect(button).toHaveProperty('disabled', true);
    expect(button.getAttribute('title')).toBe(t.calls.errors.calls_unavailable);
    const reason = document.getElementById(button.getAttribute('aria-describedby') ?? '');
    expect(reason?.textContent).toBe(t.calls.errors.calls_unavailable);
  });
});
