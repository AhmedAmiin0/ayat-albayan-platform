import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { home, soonLesson } from '@ab/web-kit/portal/portal.fixtures';
import { portalApi, type Answers } from '@ab/web-kit/portal/portal.api-fixture';
import { renderPortal } from '@ab/web-kit/portal/portal.render';
import { PortalHome } from './PortalHome';
import { reloadSeenReports } from '@ab/web-kit/portal/use-seen-reports';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const prepare = { homework: 'سورة الملك', next_plan: null, report_id: 'r9', lesson_starts_at: null };
const answers: Answers = {
  lessons: (path: string) =>
    path.includes('/s2/')
      ? { lessons: [] }
      : { lessons: [soonLesson()], prepare, month: { attended: 6, absent: 1 } },
  reports: (path: string) => ({
    reports: path.includes('/s1/')
      ? [{ id: 'r1', lesson_id: 'l1', lesson_starts_at: null, sent_at: '2026-10-20T18:00:00Z', teacher: null, recording_id: null }]
      : [],
  }),
};
const show = (over: Answers = {}) => {
  apiFetch.mockImplementation(portalApi({ ...answers, ...over }));
  return renderPortal(<PortalHome />);
};
const card = (name: string) => screen.getByRole('article', { name });

describe('PortalHome: the guardian sees every child at a glance', () => {
  afterEach(() => {
    apiFetch.mockReset();
    localStorage.clear();
    reloadSeenReports();
  });

  it('one card per child: name, code, the next lesson with its countdown and join', async () => {
    show();
    expect(await screen.findByRole('article', { name: 'سلمى' })).toBeTruthy();
    expect(card('يوسف')).toBeTruthy();
    const salma = within(card('سلمى'));
    expect(salma.getByText(t.portal.code.replace('{code}', 'AB-0201'))).toBeTruthy();
    expect(await salma.findByRole('button', { name: t.portal.join })).toBeTruthy();
    expect(salma.getByRole('timer').textContent).toMatch(/\d\d:\d\d:\d\d/);
    expect(await within(card('يوسف')).findByText(t.portal.lessonsEmpty)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/s1/lessons');
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/s2/lessons');
  });

  it('«ما المطلوب», this month, the package with the amount due and the new reports', async () => {
    show();
    const salma = within(await screen.findByRole('article', { name: 'سلمى' }));
    expect(await salma.findByText('سورة الملك')).toBeTruthy();
    expect(salma.queryByText(t.portal.nextPlan)).toBeNull();
    expect(salma.getByText(t.portal.monthAttended.replace('{n}', '6'))).toBeTruthy();
    expect(await salma.findByText('8 من 12')).toBeTruthy();
    expect(salma.getByText(new RegExp(t.portal.amountDue))).toBeTruthy();
    expect(await salma.findByText(t.portal.newReports.one)).toBeTruthy();
  });

  it('a card opens that child with its tabs; «كل الأبناء» goes back', async () => {
    show();
    const open = await screen.findAllByRole('button', { name: t.portal.openChild });
    fireEvent.click(open[1] as HTMLElement);
    expect(await screen.findByRole('heading', { name: 'يوسف' })).toBeTruthy();
    const tabs = screen.getAllByRole('tab').map((x) => x.textContent);
    const { upcomingTab, attendedTab, absentTab, packageTab } = t.portal;
    const recordings = t.lessonFiles.recordings;
    expect(tabs).toEqual([upcomingTab, attendedTab, absentTab, recordings, packageTab]);
    fireEvent.click(screen.getByRole('button', { name: t.portal.allChildren }));
    expect(await screen.findByRole('article', { name: 'سلمى' })).toBeTruthy();
  });

  it('no WhatsApp link anywhere, even with renew_url from an old API', async () => {
    show();
    fireEvent.click((await screen.findAllByRole('button', { name: t.portal.openChild }))[0] as HTMLElement);
    fireEvent.click(await screen.findByRole('tab', { name: t.portal.packageTab }));
    expect(await screen.findByText(t.portal.payments)).toBeTruthy();
    expect(document.querySelector('a[href*="wa.me"], a[href*="whatsapp"]')).toBeNull();
  });

  it('no linked student: its own empty state', async () => {
    show({ me: home({ students: [] }) });
    expect(await screen.findByText(t.portal.noStudents)).toBeTruthy();
  });

  it('a failed load says so and retries', async () => {
    apiFetch.mockImplementation(portalApi(answers));
    apiFetch.mockRejectedValueOnce(new Error('down'));
    renderPortal(<PortalHome />);
    fireEvent.click(await screen.findByRole('button', { name: t.common.retry }));
    await waitFor(() => expect(screen.getByRole('article', { name: 'سلمى' })).toBeTruthy());
  });
});
