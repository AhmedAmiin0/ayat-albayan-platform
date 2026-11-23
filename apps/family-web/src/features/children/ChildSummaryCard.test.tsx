import type { PortalKind, PortalStudent } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/i18n';
import { portalApi, type Answers, kid, lesson } from '@ab/web-kit/testing';
import { renderAt } from '#/test/render-at.tsx';
import { ChildSummaryCard } from './ChildSummaryCard';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/http', async (orig) => ({ ...(await orig<object>()), apiFetch }));

// lesson(): 16:00Z on 27 Oct, its join window 15:50–16:45.
const OPEN = new Date('2026-10-27T15:55:00.000Z');
const EARLY = new Date('2026-10-27T12:00:00.000Z');
const LESSONS = { lessons: [lesson()], month: { attended: 6, absent: 1 } };
const REPORT = {
  id: 'r1', lesson_id: 'h1', lesson_starts_at: '2026-10-20T16:00:00.000Z',
  sent_at: '2026-10-20T17:00:00.000Z', teacher: null, recording_id: null,
};
const openName = (name: string) => t.portal.app.home.open.replace('{name}', name);

function show(opts: { kind?: PortalKind; student?: PortalStudent; answers?: Answers } = {}) {
  const { kind = 'guardian', student = kid(), answers = {} } = opts;
  apiFetch.mockImplementation(portalApi({ lessons: LESSONS, ...answers }));
  const onChoose = vi.fn();
  renderAt(<ChildSummaryCard student={student} kind={kind} onChoose={onChoose} />);
  return onChoose;
}

/** The pick button, once every read is in (no skeleton left). */
async function pickButton() {
  await screen.findByRole('article');
  await vi.waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  return screen.getByRole('button', { name: openName(kid().name) });
}

beforeEach(() => {
  apiFetch.mockReset();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(EARLY);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('a child on «اختر الطالب» (owner 2026-11-19)', () => {
  it('who, the next lesson, the last report and this month, as lines not boxes', async () => {
    show({ answers: { reports: { reports: [REPORT] } } });
    const card = await screen.findByRole('article', { name: kid().name });
    expect(within(card).getByRole('heading', { level: 2 }).textContent).toBe(kid().name);
    expect(await within(card).findByText(t.portal.monthAttended.replace('{n}', '6'))).toBeTruthy();
    const teacher = t.portal.app.lesson.teacher.replace('{name}', 'أبرار');
    expect(within(card).getByText(teacher)).toBeTruthy();
    expect(card.textContent).toContain(t.portal.app.children.lastReport.split('{date}')[0]);
    const fresh = within(card).getByText(t.portal.newReports.one);
    expect(fresh.getAttribute('data-tone')).toBe('act');
  });

  it('before the window: no «ادخل الحلقة», and opening the child is the card’s primary', async () => {
    const onChoose = show();
    const pick = await pickButton();
    expect(screen.queryByRole('button', { name: t.portal.join })).toBeNull();
    expect(screen.queryByText(t.portal.app.lesson.openNow)).toBeNull();
    expect(pick.className).toContain('bg-primary');
    fireEvent.click(pick);
    expect(onChoose).toHaveBeenCalled();
  });

  it('inside the window: «الدخول متاح الآن», the join, and the pick steps back to secondary', async () => {
    vi.setSystemTime(OPEN);
    show();
    const pick = await pickButton();
    expect(screen.getByRole('button', { name: t.portal.join })).toBeTruthy();
    expect(screen.getByText(t.portal.app.lesson.openNow)).toBeTruthy();
    expect(pick.className).not.toContain('bg-primary');
  });

  it('a guardian sees the package and the amount due as the pill to act on', async () => {
    show();
    await pickButton();
    const due = await screen.findByText(t.portal.amountDue, { exact: false });
    expect(due.getAttribute('data-tone')).toBe('act');
    expect(screen.getByText(t.portal.usedOf.replace('{used}', '8').replace('{total}', '12')))
      .toBeTruthy();
    const open = screen.getByRole('link', { name: new RegExp(t.portal.packageTab) });
    expect(open.getAttribute('href')).toBe(`/package/${kid().id}`);
  });

  it('a child’s own login: no package, never even read', async () => {
    show({ kind: 'student' });
    await pickButton();
    expect(screen.queryByText(t.portal.packageTab)).toBeNull();
    const reads = apiFetch.mock.calls.map(([path]) => String(path));
    expect(reads.some((path) => path.endsWith('/package'))).toBe(false);
  });

  it('a guardian who studies reads «أنا» on their own card', async () => {
    show({ student: kid({ contact_is_self: true }) });
    await pickButton();
    expect(screen.getByText(t.portal.app.pick.me)).toBeTruthy();
  });

  it('nothing booked: a quiet line in place of the lesson', async () => {
    show({ answers: { lessons: { lessons: [] } } });
    await pickButton();
    expect(screen.getByText(t.portal.lessonsEmpty)).toBeTruthy();
    expect(screen.getByText(t.portal.app.children.noReport)).toBeTruthy();
  });
});
