import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { useMaySend, useTriesAfterWindow } from './may-send';
import { InboxModeContext, type InboxMode } from './mode';

// Owner 2026-11-01 «do the same as the messages»: a payment link, a reply, a quote, a file and a
// forward follow the text rule; a chat older than 24 h on a Kapso chat line is still tried.

const old = '2026-10-29T10:00:00Z';
const closedKapso = thread({ session_open: false, last_inbound_at: old, try_after_window: true });
const closedMeta = thread({ session_open: false, last_inbound_at: old });

function hooks(mode: InboxMode, th: typeof closedKapso) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <InboxModeContext.Provider value={mode}>{children}</InboxModeContext.Provider>
  );
  return renderHook(() => [useMaySend(th), useTriesAfterWindow(th)], { wrapper }).result.current;
}

describe('useMaySend', () => {
  it.each(['admin', 'sales'] as const)('%s, a chat older than 24 h on Kapso: sent, tried after the window', (mode) => {
    expect(hooks(mode, closedKapso)).toEqual([true, true]);
  });

  it('a Meta chat line after the window: not sent (409 as for a text)', () => {
    expect(hooks('sales', closedMeta)).toEqual([false, false]);
  });

  it('teacher mode never tries after the window (docs/19)', () => {
    expect(hooks('teacher', closedKapso)).toEqual([false, false]);
  });

  it('inside the window: sent, nothing tried', () => {
    expect(hooks('teacher', thread({ session_open: true }))).toEqual([true, false]);
  });
});
