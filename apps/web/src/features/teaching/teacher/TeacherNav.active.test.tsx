import {
  createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { teacherPagesWrapper } from '@/lib/settings/teacher-pages-testing';
import { TeacherNav } from './TeacherNav';

/** The nav under a real router at `url` (an old link may still carry ?tab=, docs/48). */
function showAt(url: string) {
  const root = createRootRoute({ component: () => <><TeacherNav /><Outlet /></> });
  const pages = ['/teacher', '/teacher/students'].map((path) =>
    createRoute({ getParentRoute: () => root, path, component: () => null }),
  );
  const history = createMemoryHistory({ initialEntries: [url] });
  const router = createRouter({ routeTree: root.addChildren(pages), history });
  render(<RouterProvider router={router} />, { wrapper: teacherPagesWrapper(true) });
}

describe('TeacherNav «اليوم» stays current whatever the search', () => {
  it('on /teacher?tab=week «اليوم» is the current page', async () => {
    showAt('/teacher?tab=week');
    const today = await screen.findByRole('link', { name: t.teacherNav.today });
    expect(today.getAttribute('aria-current')).toBe('page');
  });

  it('on another page «اليوم» is not current (still exact)', async () => {
    showAt('/teacher/students');
    const students = await screen.findByRole('link', { name: t.teacherNav.students });
    expect(students.getAttribute('aria-current')).toBe('page');
    const today = screen.getByRole('link', { name: t.teacherNav.today });
    expect(today.getAttribute('aria-current')).toBeNull();
  });
});
