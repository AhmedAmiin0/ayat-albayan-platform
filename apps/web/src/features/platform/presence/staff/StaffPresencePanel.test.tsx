import type { StaffPresence, UserRole } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Me, meQuery } from '@/features/people/auth';
import { t } from '@/lib/i18n/i18n';
import { StaffPresencePanel } from './StaffPresencePanel';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/lib/http/supabase', () => ({ supabase: {} }));
/** No Realtime (as CI's e2e stack): online comes from a recent last seen. */
vi.mock('@ab/client-core', async (orig) => ({ ...(await orig<object>()), watchPresence: () => () => undefined }));

const p = t.presence;
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const row = (name: string, role: UserRole, lastSeenAt: string | null) => ({
  profile_id: name,
  name,
  role,
  last_seen_at: lastSeenAt,
});
const show = (role: UserRole = 'admin') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const me: Me = { id: 'me', email: null, role, permissions: [] };
  client.setQueryData(meQuery.queryKey, me);
  return render(
    <QueryClientProvider client={client}>
      <StaffPresencePanel />
    </QueryClientProvider>,
  );
};
const answer = (body: StaffPresence) => apiFetch.mockResolvedValue(body);
const region = () => screen.getByRole('region', { name: p.staffTitle });

describe('StaffPresencePanel: «حالة الفريق» (docs/33 §2)', () => {
  afterEach(() => apiFetch.mockReset());

  it('online first, then the newest last seen, never seen last; the online count', async () => {
    answer({
      enabled: true,
      staff: [row('هدى', 'sales', null), row('سالم', 'teacher', ago(30)), row('منى', 'admin', ago(1))],
    });
    show();
    const items = await within(region()).findAllByRole('listitem');
    expect(items.map((li) => li.querySelector('span')?.textContent)).toEqual(['منى', 'سالم', 'هدى']);
    expect(items[0]?.textContent).toContain(p.online);
    expect(items[0]?.textContent).toContain(t.activity.roles.admin);
    expect(items[1]?.textContent).toContain(p.lastSeen.replace('{when}', ''));
    expect(items[2]?.textContent).toContain(p.staffNever);
    expect(region().textContent).toContain(p.staffOnline.replace('{n}', '1'));
  });

  it('loading, then empty', async () => {
    answer({ enabled: true, staff: [] });
    show();
    expect(within(region()).getByRole('status')).toBeTruthy();
    expect(await screen.findByText(p.staffEmpty)).toBeTruthy();
  });

  it('presence off: the «القيم» note, no count', async () => {
    answer({ enabled: false, staff: [] });
    show();
    expect(await screen.findByText(p.off)).toBeTruthy();
    expect(region().textContent).not.toContain(p.staffOnline.replace('{n}', ''));
  });

  it('a failed read: the error line', async () => {
    apiFetch.mockRejectedValue(new Error('boom'));
    show();
    expect((await screen.findByText(p.loadError)).getAttribute('role')).toBe('alert');
  });

  it('not an admin: nothing, no request', () => {
    const { container } = show('sales');
    expect(container.textContent).toBe('');
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
