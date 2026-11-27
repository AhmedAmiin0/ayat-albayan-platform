import type { PortalStudent } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { home, kid } from '@ab/web-kit/testing';
import { renderAt } from '@/test/render-at';
import { WithPick } from './WithPick';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
// The profile the pick is saved under (the shell's guard reads the rest of the module).
vi.mock('@ab/web-kit/auth/me/me', async (orig) => ({
  ...(await orig<object>()),
  meQuery: { queryKey: ['me'], queryFn: () => ({ id: 'g1', role: 'guardian', permissions: [] }) },
}));

const P = t.portal.app.pick;
const openName = (name: string) => t.portal.app.home.open.replace('{name}', name);
const page = (student: PortalStudent) => <h1>{`page ${student.id}`}</h1>;

/** GET /portal/me answers `me`; the cards' own reads never do (only the picker is tested). */
const meIs = (me: ReturnType<typeof home>) =>
  apiFetch.mockImplementation((path?: string) =>
    String(path).endsWith('/portal/me') ? Promise.resolve(me) : new Promise(() => undefined),
  );

beforeEach(() => {
  apiFetch.mockReset();
});

describe('«اختر الطالب» (owner 2026-11-16)', () => {
  it('a student, or a guardian of one child, goes straight to that student’s page', async () => {
    meIs(home({ kind: 'student', students: [kid()] }));
    renderAt(<WithPick>{page}</WithPick>, '/portal');
    expect(await screen.findByRole('heading', { name: 'page s1' })).toBeTruthy();
  });

  it('a guardian of two picks a child first, then the pages are that child’s', async () => {
    meIs(home({ students: [kid(), kid({ id: 's2', code: 'AB-0202', name: 'Yusuf' })] }));
    renderAt(<WithPick>{page}</WithPick>, '/portal');
    expect(await screen.findByRole('heading', { name: P.title })).toBeTruthy();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText(P.hint)).toBeTruthy();
    const card = screen.getByRole('article', { name: 'Yusuf' });
    fireEvent.click(within(card).getByRole('button', { name: openName('Yusuf') }));
    expect(await screen.findByRole('heading', { name: 'page s2' })).toBeTruthy();
  });

  it('a login with no student yet: the empty note and its hint, no picker', async () => {
    meIs(home({ students: [] }));
    renderAt(<WithPick>{page}</WithPick>, '/portal');
    expect(await screen.findByText(t.portal.noStudents)).toBeTruthy();
    expect(screen.getByText(t.portal.noStudentsHint)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: P.title })).toBeNull();
  });
});
