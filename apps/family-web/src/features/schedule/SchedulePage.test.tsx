import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { home, kid, soonLesson } from '@ab/web-kit/portal/portal.fixtures';
import { renderAt } from '@/test/render-at';
import { SchedulePage } from './SchedulePage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const S = t.portal.app.schedule;

beforeEach(() => apiFetch.mockReset());

describe('«الجدول»', () => {
  it('a guardian: the week across children, a child filter, each lesson with its child', async () => {
    apiFetch.mockImplementation(async (path?: string) =>
      String(path).includes('/s1/') ? { lessons: [soonLesson()] } : { lessons: [] },
    );
    renderAt(<SchedulePage home={home()} />);
    expect(await screen.findByText(kid().name, { selector: 'span' })).toBeTruthy();
    expect(screen.getByRole('group', { name: S.filter })).toBeTruthy();
    expect(screen.getByRole('heading', { name: S.title })).toBeTruthy();
  });

  it('a student: «جدولي», no filter, and the empty week', async () => {
    apiFetch.mockResolvedValue({ lessons: [] });
    renderAt(<SchedulePage home={home({ kind: 'student', students: [kid()] })} />);
    expect(await screen.findByText(S.empty)).toBeTruthy();
    expect(screen.getByRole('heading', { name: S.mine })).toBeTruthy();
    expect(screen.queryByRole('group', { name: S.filter })).toBeNull();
  });
});
