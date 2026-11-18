import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { kid, soonLesson } from '@ab/web-kit/portal/portal.fixtures';
import { renderAt } from '@/test/render-at';
import { SchedulePage } from './SchedulePage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const S = t.portal.app.schedule;

beforeEach(() => apiFetch.mockReset());

describe('«الجدول» of the student in view (owner 2026-11-16)', () => {
  it('a guardian: the picked child’s week under «الجدول»', async () => {
    apiFetch.mockResolvedValue({ lessons: [soonLesson()] });
    renderAt(<SchedulePage student={kid()} kind="guardian" />);
    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: S.title })).toBeTruthy();
  });

  it('a student: «جدولي» and the empty week', async () => {
    apiFetch.mockResolvedValue({ lessons: [] });
    renderAt(<SchedulePage student={kid()} kind="student" />);
    expect(await screen.findByText(S.empty)).toBeTruthy();
    expect(screen.getByRole('heading', { name: S.mine })).toBeTruthy();
  });
});
