import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient, routeFetch } from '../../testing/test-utils';
import { activeRow, CallProbe, CONFIG, fakeRtc } from './call-test-kit';
import { CallProvider } from './CallProvider';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/lib/http/supabase', () => {
  const ch = { on: () => ch, subscribe: () => ch };
  return { supabase: { channel: () => ch, removeChannel: vi.fn(async () => 'ok') } };
});

afterEach(() => {
  apiFetch.mockReset();
  // The provider unmounts after this and ends a live call (POST /end): always a promise.
  apiSend.mockReset().mockResolvedValue(undefined);
});

const placed = activeRow({ id: 'c9', direction: 'outbound', status: 'ringing', offer_sdp: null });

/** /calls/active lists our call once POST /calls answered (`live.value`). */
function mount(rtc = fakeRtc(), live = { value: false }) {
  routeFetch(apiFetch, [['/calls/config', CONFIG], ['/calls/permission/', { state: 'granted', expires_at: null }]]);
  const routed = apiFetch.getMockImplementation();
  apiFetch.mockImplementation(async (path: string) => (path === '/calls/active' ? (live.value ? [placed] : []) : routed?.(path)));
  renderWithClient(
    <CallProvider rtc={rtc}>
      <CallProbe />
    </CallProvider>,
  );
  return rtc;
}

describe('ending a call that is still starting', () => {
  it('«إنهاء» while POST /calls is in flight ends the call it created and stops the mic', async () => {
    let answer: (v: unknown) => void = () => undefined;
    apiSend.mockImplementation((_m: string, path: string) => (path === '/calls' ? new Promise((r) => (answer = r)) : Promise.resolve({})));
    const rtc = mount();
    fireEvent.click(await screen.findByRole('button', { name: 'probe' }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/calls', expect.anything()));
    fireEvent.click(screen.getByRole('button', { name: t.calls.controls.end }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(rtc.track.stop).toHaveBeenCalled();
    answer(activeRow({ id: 'c9', direction: 'outbound', status: 'connecting', offer_sdp: null }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/calls/c9/end'));
  });

  it('lost media: says so and ends the call', async () => {
    const live = { value: false };
    apiSend.mockImplementation(async (_m: string, path: string) => {
      if (path === '/calls') live.value = true;
      return placed;
    });
    const rtc = mount(fakeRtc(), live);
    fireEvent.click(await screen.findByRole('button', { name: 'probe' }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/calls', expect.anything()));
    await screen.findByRole('dialog');
    await waitFor(() => expect(rtc.track.stop).not.toHaveBeenCalled());
    rtc.pc.connectionState = 'failed';
    rtc.pc.dispatchEvent(new Event('connectionstatechange'));
    expect(await screen.findByText(t.calls.errors.media_failed)).toBeTruthy();
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/calls/c9/end'));
  });
});

describe('the incoming call screen', () => {
  it('starts focus on the caller\'s name, not on «قبول»; Esc keeps it on screen', async () => {
    routeFetch(apiFetch, [['/calls/config', CONFIG], ['/calls/active', [activeRow()]]]);
    renderWithClient(<CallProvider rtc={fakeRtc()}>{null}</CallProvider>);
    const dialog = await screen.findByRole('alertdialog');
    expect(document.activeElement?.tagName).toBe('H2');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(dialog.isConnected).toBe(true);
  });
});
