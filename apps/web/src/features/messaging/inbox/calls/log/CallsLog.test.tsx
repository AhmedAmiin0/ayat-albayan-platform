import type { CallView } from '@ab/shared';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient, routeFetch } from '../../testing/test-utils';
import { CallsLog } from './CallsLog';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../../testing/test-utils')).MockLink }));

const call = (patch: Partial<CallView>): CallView => ({
  id: 'c1', phone_e164: '+966501234567', direction: 'outbound', status: 'ended', end_reason: 'completed', display_name: 'أم سهيلة',
  staff_id: 'u1', started_at: '2026-10-26T10:00:00Z', answered_at: null, ended_at: null, duration_seconds: 134, ...patch,
});

afterEach(() => apiFetch.mockReset());

describe('«المكالمات»', () => {
  it('lists the calls newest first with name, kind and talk time; a row opens the chat', async () => {
    routeFetch(apiFetch, [['/calls?limit=100', [call({}), call({ id: 'c2', direction: 'inbound', end_reason: 'missed', duration_seconds: null, display_name: null })]]]);
    renderWithClient(<CallsLog />);
    const list = await screen.findByRole('list', { name: t.calls.log.title });
    const rows = list.querySelectorAll('li');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain('أم سهيلة');
    expect(rows[0]?.textContent).toContain('2:14');
    expect(rows[1]?.textContent).toContain(t.calls.entry.missed);
    expect(rows[0]?.querySelector('a')?.getAttribute('href')).toContain('phone=%2B966501234567');
  });

  it('says so when there are none', async () => {
    routeFetch(apiFetch, [['/calls?limit=100', []]]);
    renderWithClient(<CallsLog />);
    expect(await screen.findByText(t.calls.log.empty)).toBeTruthy();
  });
});
