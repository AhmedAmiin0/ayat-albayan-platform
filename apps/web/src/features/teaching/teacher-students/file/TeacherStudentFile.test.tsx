import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { HEAD } from './file-data';
import { renderFile } from './file-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

const MONEY = /ريال|جنيه|SAR|EGP|USD|\$|سعر|دفع|فاتورة|باقة/;

describe('TeacherStudentFile «ملف الطالب» (docs/47)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-09T12:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
  });

  it('the head: title, name, code and status chip; the course line; no money', async () => {
    renderFile({ apiFetch });
    expect(await screen.findByText('سهيلة')).toBeTruthy();
    expect(screen.getByText(t.teacherFile.title)).toBeTruthy();
    expect(screen.getByText('AB-0183')).toBeTruthy();
    expect(screen.getByText(t.enums.studentStatus.active)).toBeTruthy();
    expect(screen.getByText(/تنتهي الدورة بعد 3 حلقات/)).toBeTruthy();
    expect(screen.getByText(t.teacherFile.courseHint)).toBeTruthy();
    expect(screen.queryByRole('note')?.textContent ?? '').not.toContain(t.teacherDash.trialChatViaSales);
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/students/s-1');
    expect(document.body.textContent).not.toMatch(MONEY);
  });

  it('a trial student shows the «through sales» note', async () => {
    renderFile({ apiFetch, head: () => ({ ...HEAD, status: 'trial' }) });
    const note = await screen.findByText(t.teacherDash.trialChatViaSales);
    expect(note.getAttribute('role')).toBe('note');
  });

  it('no course says so', async () => {
    renderFile({ apiFetch, head: () => ({ ...HEAD, course: null }) });
    expect(await screen.findByText(t.teacherFile.noCourse)).toBeTruthy();
  });

  it.each([403, 404])('a %i reads «forbidden»', async (status) => {
    renderFile({ apiFetch, head: () => { throw new ApiError(status, { error: 'student_not_found' }); } });
    expect(await screen.findByText(t.common.forbidden)).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('pending reports: only this student’s', async () => {
    renderFile({ apiFetch });
    const pending = await screen.findByRole('region', { name: t.reports.pending });
    expect(within(pending).getAllByRole('listitem')).toHaveLength(1);
    expect(within(pending).getByRole('link', { name: t.reports.open }).getAttribute('href')).toBe('/teacher/report/l-1');
    expect(within(pending).queryByText('آية')).toBeNull();
  });

  it('«الحلقات» (default): the next 14 days with a cancel reason, then the month log', async () => {
    const onTab = vi.fn();
    renderFile({ apiFetch, onTab });
    const upcoming = await screen.findByRole('table', { name: t.teacherFile.upcoming });
    const [, cancelled] = within(upcoming).getAllByRole('row').slice(1);
    expect(within(cancelled as HTMLElement).getByText(/سفر الأسرة/)).toBeTruthy();
    expect(await screen.findByRole('region', { name: t.teacherBoard.attendanceLog })).toBeTruthy();
    const tabs = screen.getByRole('tablist', { name: t.teacherFile.tabs });
    expect(within(tabs).getAllByRole('tab').map((x) => x.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    fireEvent.click(within(tabs).getByRole('tab', { name: t.teacherBoard.reportsTab }));
    expect(onTab).toHaveBeenCalledWith('reports');
  });
});
