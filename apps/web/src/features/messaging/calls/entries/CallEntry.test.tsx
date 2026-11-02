import type { CallsUi } from '@ab/client-core';
import type { CallView } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { CallsContext } from '@/features/messaging/calls/state/call-context';
import { CallEntry } from './CallEntry';
import { callEntryText } from './call-text';

const call = (patch: Partial<CallView> = {}): CallView => ({
  id: 'c1', phone_e164: '+966501234567', direction: 'outbound', status: 'ended', end_reason: 'completed', display_name: 'أم سهيلة',
  staff_id: 'u1', started_at: '2026-10-26T10:00:00Z', answered_at: '2026-10-26T10:00:05Z', ended_at: null, duration_seconds: 134, ...patch,
});

function ui(patch: Partial<CallsUi> = {}): CallsUi {
  return { config: { enabled: true, available: true, canCall: true, iceServers: [] }, busy: false, call: vi.fn(), ...patch };
}

describe('a call in the chat log (WhatsApp-like)', () => {
  it('names each kind with the talk time', () => {
    expect(callEntryText(call())).toBe(`${t.calls.entry.outgoing} · 2:14`);
    expect(callEntryText(call({ direction: 'inbound', duration_seconds: 40 }))).toBe(`${t.calls.entry.incoming} · 0:40`);
    expect(callEntryText(call({ direction: 'inbound', end_reason: 'missed', duration_seconds: null }))).toBe(t.calls.entry.missed);
    expect(callEntryText(call({ end_reason: 'no_answer', duration_seconds: null }))).toBe(t.calls.entry.unanswered);
  });

  it('a missed call is red; tapping calls back', () => {
    const calls = ui();
    render(
      <CallsContext.Provider value={calls}>
        <ul>
          <CallEntry call={call({ direction: 'inbound', end_reason: 'missed', duration_seconds: null })} canCall />
        </ul>
      </CallsContext.Provider>,
    );
    expect(screen.getByText(t.calls.entry.missed).className).toMatch(/text-danger/);
    fireEvent.click(screen.getByRole('button', { name: `${t.calls.entry.missed}. ${t.calls.callBack}` }));
    expect(calls.call).toHaveBeenCalledWith({ phone: '+966501234567', name: 'أم سهيلة' });
  });

  it('no call back while calls are off, or for someone who may not call', () => {
    const { rerender } = render(
      <ul>
        <CallEntry call={call()} canCall />
      </ul>,
    );
    expect(screen.queryByRole('button')).toBeNull();
    rerender(
      <CallsContext.Provider value={ui()}>
        <ul>
          <CallEntry call={call()} canCall={false} />
        </ul>
      </CallsContext.Provider>,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(`${t.calls.entry.outgoing} · 2:14`)).toBeTruthy();
  });
});
