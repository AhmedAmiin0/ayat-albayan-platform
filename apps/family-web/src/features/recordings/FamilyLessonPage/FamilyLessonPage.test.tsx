import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { portalApi, lessonPage } from '@ab/web-kit/testing';
import { renderAt } from '@/test/render-at';
import { FamilyLessonPage } from './FamilyLessonPage';
import { FamilyRecordingsPage } from '@/features/recordings/FamilyRecordingsPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const F = t.lessonFiles;

/** The portal's answers, the lesson page and the recordings list beside them. */
function answer(recordings: unknown[] = []) {
  const portal = portalApi();
  apiFetch.mockImplementation(async (path: string) => {
    if (path.endsWith('/files')) return lessonPage({ recordings: [] });
    if (path.endsWith('/recordings')) return { items: recordings };
    return portal(path);
  });
}

afterEach(() => apiFetch.mockReset());

describe('`/lesson/<id>` and `/recordings/<id>` (the app’s lesson and recordings screens)', () => {
  it('a child’s lesson: its files and the way back; the report opens on its own page', async () => {
    answer();
    const { router } = renderAt(<FamilyLessonPage lessonId="L1" studentId="s1" />, '/lesson/L1');
    expect(await screen.findByText(F.header.replace('{n}', '2'))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: F.openReport }));
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/report/r-L1'));
    expect(router.state.location.search).toEqual({ studentId: 's1' });
  });

  it('a student not on this login: «لم نجد ما تبحث عنه», no lesson read', async () => {
    answer();
    renderAt(<FamilyLessonPage lessonId="L1" studentId="other" />);
    expect(await screen.findByText(t.common.notFound)).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalledWith('/portal/students/other/lessons/L1/files');
  });

  it('the recordings page: «التسجيلات» over the child’s name, the empty note when none', async () => {
    answer();
    renderAt(<FamilyRecordingsPage studentId="s1" />);
    expect(await screen.findByRole('heading', { name: F.recordings })).toBeTruthy();
    expect(await screen.findByText(F.empty)).toBeTruthy();
    expect(screen.getByText('سلمى')).toBeTruthy();
  });
});
