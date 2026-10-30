import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { home, kid } from './portal.fixtures';
import { renderPortal } from './portal.render';
import { PortalHome } from './PortalHome';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

function answer(me: unknown) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === '/portal/me') return me;
    if (path.endsWith('/lessons')) return { lessons: [] };
    if (path.endsWith('/channel/unread')) return { unread: 0 };
    return { package: null };
  });
}
const tabNames = () => screen.getAllByRole('tab').map((x) => x.textContent);

// Owner 2026-10-29: the guardian chats for a child; a student only when they are their own contact.
describe('PortalHome: who has the teacher chat', () => {
  afterEach(() => apiFetch.mockReset());

  it('a child’s own login: no chat tab, no unread read', async () => {
    answer(home({ kind: 'student', students: [kid({ contact_is_self: false })] }));
    renderPortal(<PortalHome />);
    await screen.findByText(t.portal.lessonsEmpty);
    expect(tabNames()).not.toContain(t.studentChannel.portalTab);
    expect(apiFetch).not.toHaveBeenCalledWith(expect.stringContaining('/channel/'));
  });

  it('a student who is their own contact and a guardian: the chat tab', async () => {
    answer(home({ kind: 'student', students: [kid({ contact_is_self: true })] }));
    const view = renderPortal(<PortalHome />);
    await waitFor(() => expect(tabNames()).toContain(t.studentChannel.portalTab));
    view.unmount();
    answer(home());
    renderPortal(<PortalHome />);
    await waitFor(() => expect(tabNames()).toContain(t.studentChannel.portalTab));
  });
});
