import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { home, kid, soonLesson } from '@ab/web-kit/portal/portal.fixtures';
import { portalApi } from '@ab/web-kit/portal/portal.api-fixture';
import { renderPortal } from '@ab/web-kit/portal/portal.render';
import { PortalHome } from './PortalHome';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const MONEY = /SAR|ر\.س|ريال|مستحق|مدفوعات|طريقة الدفع/;

function show(contactIsSelf: boolean) {
  apiFetch.mockImplementation(
    portalApi({
      me: home({ kind: 'student', students: [kid({ contact_is_self: contactIsSelf })] }),
      lessons: { lessons: [soonLesson()], month: { attended: 2, absent: 0 } },
    }),
  );
  renderPortal(<PortalHome />);
}

describe('PortalHome: a student’s own login', () => {
  afterEach(() => apiFetch.mockReset());

  it('a child lands on their own screen: no list, no package tab, never money', async () => {
    show(false);
    expect(await screen.findByRole('heading', { name: 'سلمى' })).toBeTruthy();
    expect(screen.queryByText(t.portal.myChildren)).toBeNull();
    expect(screen.queryByRole('button', { name: t.portal.allChildren })).toBeNull();
    const tabs = screen.getAllByRole('tab').map((x) => x.textContent);
    expect(tabs).toEqual([
      t.portal.upcomingTab, t.portal.attendedTab, t.portal.absentTab, t.lessonFiles.recordings,
    ]);
    expect(await screen.findByRole('button', { name: t.portal.join })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: t.portal.attendedTab }));
    expect(await screen.findByText(t.portal.attendedEmpty)).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalledWith(expect.stringContaining('/package'));
    expect(document.body.textContent).not.toMatch(MONEY);
  });

  it('an adult who is their own contact also sees «الباقة» with its money', async () => {
    show(true);
    fireEvent.click(await screen.findByRole('tab', { name: t.portal.packageTab }));
    expect(await screen.findByText(t.portal.amountDue)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/s1/package');
  });
});
