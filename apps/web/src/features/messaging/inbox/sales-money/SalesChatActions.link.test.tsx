import type { ThreadView } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { thread } from '../testing/inbox-fixture';
import { InboxModeContext } from '../shared/mode';
import { renderWithClient, routeFetch } from '../testing/test-utils';
import { SalesChatActions } from './SalesChatActions';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
const granted = vi.hoisted(() => new Set<string>());
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: (p: string) => granted.has(p) }) }));

const L = t.inbox.linkFamily;
const MATCH = { name: 'سهيلة', code: 'AB-0183', status: 'active', teacher_name: null };

function renderActions(th: ThreadView) {
  routeFetch(apiFetch, [
    ['/sales/money/family', { students: [] }],
    ['/sales/registration-check', { found: true, more: false, matches: [MATCH] }],
  ]);
  renderWithClient(
    <InboxModeContext.Provider value="sales">
      <SalesChatActions thread={th} />
    </InboxModeContext.Provider>,
  );
}

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: t.common.more }));

describe('«ربط بطالب موجود» in the sales chat’s «المزيد» (owner 2026-10-29)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    granted.clear();
    granted.add('leads.link_family');
    granted.add('students.check_registration');
  });

  it.each(['new', 'converted', 'lost'] as const)('a %s lead chat with leads.link_family: in the menu, never the visible action', (status) => {
    renderActions(thread({ lead_status: status }));
    expect(screen.queryByRole('button', { name: L.action })).toBeNull();
    openMenu();
    expect(screen.getByRole('button', { name: L.action })).toBeTruthy();
  });

  it.each([
    ['without leads.link_family', thread(), 'leads.link_family'],
    // The picker searches with GET /sales/registration-check: without it the search could only fail.
    ['without students.check_registration', thread(), 'students.check_registration'],
    ['on a family chat', thread({ guardian_id: 'g-1', guardian_name: 'أم سهيلة' }), null],
    ['on a teacher’s chat', thread({ teacher_id: 't-1', teacher_name: 'أ. أبرار' }), null],
  ] as const)('not rendered at all %s', async (_, th, missing) => {
    if (missing) granted.delete(missing);
    renderActions(th);
    // The menu keeps its entries mounted: no text anywhere means no entry.
    await waitFor(() => expect(screen.queryByText(L.action)).toBeNull());
  });

  it('links the chat’s lead and shows «رُبط الرقم…» once the dialog closes', async () => {
    apiSend.mockResolvedValue({ linked: true });
    renderActions(thread());
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: L.action }));
    const dialog = within(screen.getByRole('dialog', { name: L.title }));
    fireEvent.change(dialog.getByLabelText(t.registrationCheck.query), { target: { value: 'AB-0183' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.search }));
    fireEvent.click(await dialog.findByRole('button', { name: /AB-0183/ }));
    fireEvent.click(screen.getByRole('button', { name: L.submit }));
    expect(await screen.findByText(L.done)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/leads/lead-1/link-family', { code: 'AB-0183' });
    expect(screen.queryByRole('dialog', { name: L.title })).toBeNull();
  });
});
