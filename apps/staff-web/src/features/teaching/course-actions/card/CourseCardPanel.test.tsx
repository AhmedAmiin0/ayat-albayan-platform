import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { CourseCardPanel } from './CourseCardPanel';

const perms = vi.hoisted(() => ({ list: [] as string[] }));
vi.mock('@/features/people/auth', async (orig) => ({
  ...(await orig<object>()),
  usePermissions: () => ({ permissions: perms.list, can: (p: string) => perms.list.includes(p) }),
}));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

// «الدورة والباقة» on the admin's file (owner 2026-11-17).
const c = t.courseCard;
const PKG = {
  ...{ status: 'active', lessonsTotal: 8, used: 3, left: 5, paid: 240, owed: 240, currency: 'SAR' },
  projectedEndAt: '2026-12-02T14:00:00Z',
};
const card = (course: object | null) => ({
  subscriptionId: 'sub1',
  package: PKG,
  course: course && {
    ...{ teacherName: 'مريم', days: [{ weekday: 0, startTimeLocal: '17:00' }], tz: 'Asia/Riyadh' },
    ...{ endsOn: '2026-12-02', lastAt: null, lessonsTotal: 8, unbooked: 2 },
    ...course,
  },
  upcoming: [{ id: 'l1', startsAt: '2026-11-18T14:00:00Z', status: 'confirmed' }],
});
const PREVIEW = { subscriptionId: 'sub1', starts: ['2026-12-06T14:00:00Z'], tz: 'Asia/Riyadh', endsOn: '2026-12-06', notified: [] };

function serve(course: object | null) {
  apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST') return { subscriptionId: 'sub1', inserted: 1, endsOn: '2026-12-06', conflicts: 0 };
    if (path.endsWith('/course-card')) return card(course);
    if (path.startsWith('/students/s1/course-extend')) return PREVIEW;
    if (path.endsWith('/course-pause')) return { open: null, history: [] };
    if (path.startsWith('/lessons?')) return [];
    throw new Error(`unexpected ${path}`);
  });
}

describe('CourseCardPanel', () => {
  beforeEach(() => {
    perms.list = ['subscriptions.stop', 'students.change_teacher', 'courses.reschedule', 'courses.pause'];
  });

  it('the course, its next lessons and every action with what it does', async () => {
    serve({});
    renderWithClient(<CourseCardPanel studentId="s1" />);
    expect(await screen.findByText(c.unbooked.two)).toBeTruthy();
    expect(screen.getByRole('region', { name: c.upcoming })).toBeTruthy();
    expect(await screen.findByRole('button', { name: c.extend.action })).toBeTruthy();
    expect(screen.getByText(c.hints.stop)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.coursePause.action })).toBeTruthy();
  });

  it('board CourseXWebPanel: «بقيت 5 حلقات», the package line and the two groups', async () => {
    serve({});
    renderWithClient(<CourseCardPanel studentId="s1" />);
    expect(await screen.findByText(c.left.few.replace('{n}', '5'))).toBeTruthy();
    expect(screen.getByText(t.enums.subscriptionStatus.active)).toBeTruthy();
    expect(screen.getByText(/3 من 8 حلقة · دُفع 240 من 240/)).toBeTruthy();
    const course = within(screen.getByRole('region', { name: c.courseGroup }));
    expect(await course.findByRole('button', { name: t.courseActions.teacher.action })).toBeTruthy();
    const money = within(screen.getByRole('region', { name: c.packageActions }));
    expect(money.getByRole('button', { name: t.courseActions.stop.action })).toBeTruthy();
  });

  it('an upcoming lesson opens its drawer (gone meanwhile: says so)', async () => {
    serve({});
    renderWithClient(<CourseCardPanel studentId="s1" />);
    const upcoming = within(await screen.findByRole('region', { name: c.upcoming }));
    fireEvent.click(upcoming.getByRole('button'));
    expect(await screen.findByText(t.common.notFound)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/lessons?from=2026-11-18T14'));
  });

  it('«مدّ الجدول» previews, books and says what it booked', async () => {
    serve({});
    renderWithClient(<CourseCardPanel studentId="s1" />);
    fireEvent.click(await screen.findByRole('button', { name: c.extend.action }));
    const dialog = within(await screen.findByRole('dialog', { name: c.extend.title }));
    expect(await dialog.findByText(c.extend.ask)).toBeTruthy();
    fireEvent.click(dialog.getByRole('button', { name: c.extend.confirm }));
    expect(await screen.findByText(c.extend.done.one, { exact: false })).toBeTruthy();
  });

  it('no course booked yet: no move to a dead end; «إلغاء الاشتراك» stays', async () => {
    serve(null);
    renderWithClient(<CourseCardPanel studentId="s1" />);
    expect(await screen.findByText(c.noCourse)).toBeTruthy();
    expect(await screen.findByRole('button', { name: t.courseActions.stop.action })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.courseActions.teacher.action })).toBeNull();
  });
});
