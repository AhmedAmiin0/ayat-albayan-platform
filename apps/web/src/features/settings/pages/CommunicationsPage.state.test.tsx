import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { CONFIG_QUERY_KEYS } from '@/lib/query-keys';
import { SETTINGS } from '@/test/settings-fixture';
import { renderCommunications } from './communications-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/inbox/test-utils')).MockLink,
}));

const p = t.settingsPages;
const hoursLabel = t.settings.reminderLookaheadHours;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

// S2/S3 (skeptic comms-stale): the timing form never resends a stale copy and outlives a tab switch.
describe('«التواصل» timing form state', () => {
  it('values changed elsewhere are never written back from a stale copy', async () => {
    const client = renderCommunications({ apiFetch, tab: 'timing' });
    const hours = await screen.findByLabelText(hoursLabel);
    act(() => {
      client.setQueryData(CONFIG_QUERY_KEYS.settings, { ...SETTINGS, booking_horizon_weeks: 9, teachers_always_available: true, activity_retention_days: 30 });
    });
    fireEvent.change(hours, { target: { value: '30' } });
    apiSend.mockResolvedValue(SETTINGS);
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    expect(Object.keys(apiSend.mock.calls[0]?.[2] as object)).toEqual(['reminderLookaheadHours']);
  });

  it('an untouched timing field follows fresh settings; an edited one keeps the edit', async () => {
    const client = renderCommunications({ apiFetch, tab: 'timing' });
    const hours = (await screen.findByLabelText(hoursLabel)) as HTMLInputElement;
    act(() => client.setQueryData(CONFIG_QUERY_KEYS.settings, { ...SETTINGS, reminder_lookahead_hours: 40 }));
    await waitFor(() => expect(hours.value).toBe('40'));
    fireEvent.change(hours, { target: { value: '30' } });
    act(() => client.setQueryData(CONFIG_QUERY_KEYS.settings, { ...SETTINGS, reminder_lookahead_hours: 50 }));
    expect(hours.value).toBe('30');
  });

  it('switching tabs keeps an unsaved timing edit', async () => {
    renderCommunications({ apiFetch, tab: 'timing' });
    fireEvent.change(await screen.findByLabelText(hoursLabel), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('tab', { name: p.communicationsTabs.templates }));
    expect(screen.queryByLabelText(hoursLabel)).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: p.communicationsTabs.timing }));
    expect(((await screen.findByLabelText(hoursLabel)) as HTMLInputElement).value).toBe('30');
  });

  it('a failed load says so inline with «أعد المحاولة», which refetches; no role=status while loading', async () => {
    let fail = true;
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/settings' && fail) throw new Error('down');
      return path === '/settings' ? SETTINGS : path === '/config/meta' ? { meta: {} } : [];
    });
    const { renderWithClient } = await import('@/features/inbox/test-utils');
    const { CommunicationsPage } = await import('./CommunicationsPage');
    renderWithClient(<CommunicationsPage tab="timing" onTab={() => undefined} />);
    expect(screen.queryAllByRole('status')).toHaveLength(0);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect((await screen.findByRole('alert')).textContent).toContain(p.loadError);
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: p.retry }));
    expect(await screen.findByLabelText(hoursLabel)).toBeTruthy();
  });
});
