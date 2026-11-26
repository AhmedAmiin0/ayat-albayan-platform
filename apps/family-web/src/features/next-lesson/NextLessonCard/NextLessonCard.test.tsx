import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { portalApi, kid, lesson } from '@ab/web-kit/testing';
import { renderAt } from '@/test/render-at';
import { NextLessonCard } from './NextLessonCard';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

// lesson(): 16:00Z on 27 Oct, its join window 15:50–16:45.
const OPEN = new Date('2026-10-27T15:55:00.000Z');
const EARLY = new Date('2026-10-27T12:00:00.000Z');

function show(lessons: object[], own = false) {
  apiFetch.mockImplementation(portalApi({ lessons: { lessons } }));
  renderAt(<NextLessonCard student={kid()} own={own} />);
}

beforeEach(() => {
  apiFetch.mockReset();
  vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('«الحلقة القادمة» on «الرئيسية» (owner 2026-11-19)', () => {
  it('nothing booked: the heading and a quiet line, no button', async () => {
    vi.setSystemTime(EARLY);
    show([]);
    expect(await screen.findByText(t.portal.lessonsEmpty)).toBeTruthy();
    expect(screen.getByRole('heading', { name: t.portal.nextLesson })).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('before the window: the countdown and the hint, no join yet', async () => {
    vi.setSystemTime(EARLY);
    show([lesson()]);
    expect(await screen.findByRole('timer')).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.portal.join })).toBeNull();
    expect(screen.queryByText(t.portal.app.lesson.openNow)).toBeNull();
  });

  it('the window open: the live dot pops in once and «ادخل الحلقة» is the one primary', async () => {
    vi.setSystemTime(OPEN);
    show([lesson()]);
    const join = await screen.findByRole('button', { name: t.portal.join });
    expect(join.className).toContain('bg-primary');
    const live = screen.getByText(t.portal.app.lesson.openNow);
    expect(live.getAttribute('data-tone')).toBe('ok');
    expect(live.querySelector('.animate-pop-in')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('a student’s own home reads «حلقتك القادمة»', async () => {
    vi.setSystemTime(EARLY);
    show([], true);
    expect(
      await screen.findByRole('heading', { name: t.portal.app.lesson.nextLessonSelf }),
    ).toBeTruthy();
  });
});
