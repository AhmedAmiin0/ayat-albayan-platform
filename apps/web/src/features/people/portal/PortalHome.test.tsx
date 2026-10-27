import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { home, kid, lesson } from './portal.fixtures';
import { renderPortal } from './portal.render';
import { PortalHome } from './PortalHome';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

function answer(me: unknown) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === '/portal/me') return me;
    if (path.endsWith('/lessons')) return { lessons: path.includes('/s2/') ? [] : [lesson()] };
    if (path.endsWith('/reports')) return { reports: [] };
    if (path.endsWith('/channel/unread')) return { unread: 3 };
    if (path.endsWith('/channel/messages')) return { student_name: 'سلمى', messages: [], has_more: false, read_only: false };
    return { package: null };
  });
}

describe('PortalHome /portal', () => {
  afterEach(() => apiFetch.mockReset());

  it('a guardian picks a child under «أبنائي»; each child reads its own lessons', async () => {
    answer(home());
    renderPortal(<PortalHome />);
    expect(await screen.findByRole('group', { name: t.portal.myChildren })).toBeTruthy();
    expect(await screen.findByText(t.portal.withTeacher.replace('{teacher}', 'أبرار'))).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/s1/lessons');
    fireEvent.click(screen.getByLabelText('يوسف'));
    expect(await screen.findByText(t.portal.lessonsEmpty)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/s2/lessons');
  });

  it('a student login or an adult who is their own contact reads «حسابي», with no chips', async () => {
    answer(home({ kind: 'student', students: [kid()] }));
    const view = renderPortal(<PortalHome />);
    expect(await screen.findByText(t.portal.myAccount)).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
    view.unmount();
    answer(home({ students: [kid({ contact_is_self: true })] }));
    renderPortal(<PortalHome />);
    expect(await screen.findByText(t.portal.myAccount)).toBeTruthy();
  });

  it('the tabs swap the sections: reports, package and the teacher chat (with its unread count)', async () => {
    answer(home());
    renderPortal(<PortalHome />);
    const tabs = await screen.findAllByRole('tab');
    const labels = [t.portal.lessonsTab, t.portal.reportsTab, t.portal.packageTab, `${t.studentChannel.portalTab} (3)`];
    await waitFor(() => expect(screen.getAllByRole('tab').map((x) => x.textContent)).toEqual(labels));
    fireEvent.click(tabs[1] as HTMLElement);
    expect(await screen.findByText(t.portal.reportsEmpty)).toBeTruthy();
    fireEvent.click(tabs[2] as HTMLElement);
    expect(await screen.findByText(t.portal.packageEmpty)).toBeTruthy();
    expect(screen.getByRole('link', { name: t.portal.renew }).getAttribute('href')).toBe('https://wa.me/966500000000');
    fireEvent.click(tabs[3] as HTMLElement);
    expect(await screen.findByLabelText(t.studentChannel.messageLabel)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/s1/channel/messages');
  });

  it('no linked student: its own empty state', async () => {
    answer(home({ students: [] }));
    renderPortal(<PortalHome />);
    expect(await screen.findByText(t.portal.noStudents)).toBeTruthy();
  });

  it('a failed load says so and retries', async () => {
    answer(home());
    apiFetch.mockRejectedValueOnce(new Error('down'));
    renderPortal(<PortalHome />);
    expect(await screen.findByText(t.portal.loadFailed)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.portal.retry }));
    await waitFor(() => expect(screen.getByRole('group', { name: t.portal.myChildren })).toBeTruthy());
  });
});
