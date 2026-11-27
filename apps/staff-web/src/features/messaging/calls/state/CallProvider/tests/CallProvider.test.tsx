import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import {
  activeRow,
  CALL_ID,
  CallProbe,
  CONFIG,
  fakeRtc,
  STAFF_ID,
} from '@/features/messaging/calls/state/call-test-kit';
import { CallProvider } from '@/features/messaging/calls/state/CallProvider/CallProvider';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
const channel = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/supabase', () => {
  const ch = { on: () => ch, subscribe: () => ch };
  channel.mockReturnValue(ch);
  return { supabase: { channel, removeChannel: vi.fn(async () => 'ok') } };
});

function mount(routes: readonly (readonly [string, unknown])[]) {
  routeFetch(apiFetch, routes);
  renderWithClient(
    <CallProvider rtc={fakeRtc()}>
      <CallProbe />
    </CallProvider>,
  );
}

afterEach(() => {
  apiFetch.mockReset();
  // The provider unmounts after this and ends a live call (POST /end): always a promise.
  apiSend.mockReset().mockResolvedValue(undefined);
  channel.mockClear();
});

describe('calls off (whatsapp_calls_enabled false)', () => {
  it('asks only the config: no poll, no realtime, no phone icon', async () => {
    mount([['/calls/config', { ...CONFIG, enabled: false }]]);
    await screen.findByText('calls-off');
    await new Promise((r) => setTimeout(r, 20));
    expect(apiFetch.mock.calls.map(([p]) => p)).toEqual(['/calls/config']);
    expect(channel).not.toHaveBeenCalled();
  });
});

describe('an incoming call', () => {
  it('rings full screen; «قبول» answers the offer with our SDP', async () => {
    mount([['/calls/config', CONFIG], ['/calls/active', [activeRow()]]]);
    const dialog = await screen.findByRole('alertdialog', { name: 'أم سهيلة' });
    expect(dialog.textContent).toContain(t.calls.status.incoming);
    apiSend.mockResolvedValue(activeRow({ status: 'active', staff_id: STAFF_ID }));
    fireEvent.click(screen.getByRole('button', { name: t.calls.controls.accept }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', `/calls/${CALL_ID}/accept`, { sdp: 'v=0 answer' }));
    expect(await screen.findByRole('dialog', { name: 'أم سهيلة' })).toBeTruthy();
  });

  it('«رفض» declines and stops ringing at once', async () => {
    mount([['/calls/config', CONFIG], ['/calls/active', [activeRow()]]]);
    await screen.findByRole('alertdialog');
    apiSend.mockResolvedValue(activeRow({ status: 'ended', end_reason: 'declined' }));
    fireEvent.click(screen.getByRole('button', { name: t.calls.controls.decline }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(apiSend).toHaveBeenCalledWith('POST', `/calls/${CALL_ID}/reject`, undefined);
  });
});

describe('calling a chat', () => {
  it('with permission: our gathered offer goes to POST /calls once', async () => {
    mount([['/calls/config', CONFIG], ['/calls/active', []], ['/calls/permission/', { state: 'granted', expires_at: null }]]);
    apiSend.mockResolvedValue(activeRow({ direction: 'outbound', status: 'connecting', offer_sdp: null }));
    fireEvent.click(await screen.findByRole('button', { name: 'probe' }));
    expect(await screen.findByRole('dialog', { name: 'أم سهيلة' })).toBeTruthy();
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/calls', expect.objectContaining({ phone: '+966501234567', sdp: 'v=0 ours' })));
    // Never a second connect (a poll that no longer lists the call may only end it).
    expect(apiSend.mock.calls.filter(([, path]) => path === '/calls')).toHaveLength(1);
  });

  it('without permission inside the window: «اطلب إذن الاتصال» sends the request', async () => {
    mount([['/calls/config', CONFIG], ['/calls/active', []], ['/calls/permission/', { state: 'request', expires_at: null }]]);
    fireEvent.click(await screen.findByRole('button', { name: 'probe' }));
    expect(await screen.findByText(t.calls.permission.requestHint)).toBeTruthy();
    apiSend.mockResolvedValue({ id: 'm1' });
    fireEvent.click(screen.getByRole('button', { name: t.calls.permission.request }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/calls/permission/%2B966501234567/request', expect.objectContaining({ clientRequestId: expect.any(String) })));
    expect(await screen.findByText(t.calls.permission.requestSent)).toBeTruthy();
  });

  it('outside the window: says a template is needed, with no request button', async () => {
    mount([['/calls/config', CONFIG], ['/calls/active', []], ['/calls/permission/', { state: 'needs_template', expires_at: null }]]);
    fireEvent.click(await screen.findByRole('button', { name: 'probe' }));
    expect(await screen.findByText(t.calls.permission.needsTemplate)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.calls.permission.request })).toBeNull();
  });
});
