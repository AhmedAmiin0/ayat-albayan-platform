import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PermissionAsk } from '@ab/client-core';
import { t } from '@/lib/i18n/i18n';
import { callApi } from '@/features/messaging/calls/api/calls-api';
import { PermissionDialog } from './PermissionDialog';

// The permission sheet of a calls number (docs/28 §10): the request only on a tap, the reason when
// none.

const PHONE = '+966501234567';

function renderSheet(ask: PermissionAsk) {
  const onSent = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PermissionDialog ask={ask} onClose={vi.fn()} onSent={onSent} />
    </QueryClientProvider>,
  );
  return { onSent };
}

describe('PermissionDialog', () => {
  it("outside the calls number's window: says the template will be sent; nothing goes before the tap", async () => {
    const send = vi
      .spyOn(callApi, 'requestCallPermission')
      .mockResolvedValue({ id: 'm1' } as never);
    const { onSent } = renderSheet({ phone: PHONE, state: 'request', via: 'template' });
    expect(screen.getByText(t.calls.permission.viaTemplate)).toBeTruthy();
    expect(send).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: t.calls.permission.request }));
    await vi.waitFor(() => expect(onSent).toHaveBeenCalled());
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("no template set: the reason and no request button; the family's last answer shows", () => {
    renderSheet({
      phone: PHONE,
      state: 'needs_template',
      via: 'template',
      reply: { response: 'rejected', at: '2026-10-27T09:00:00Z', expires_at: null },
    });
    expect(screen.getByText(t.calls.permission.noTemplate)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.calls.permission.request })).toBeNull();
    expect(
      screen.getByText((text) =>
        text.startsWith(t.calls.permission.replyRejected.split('(')[0] ?? ''),
      ),
    ).toBeTruthy();
  });
});
