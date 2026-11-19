import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { kid, lesson } from '@ab/web-kit/portal/portal.fixtures';
import { renderPortal } from '@ab/web-kit/portal/portal.render';
import { LessonCard } from '@ab/web-kit/portal/lessons/LessonCard';

// lesson(): 16:00Z on 27 Oct, its join window 15:50–16:45.
const NOW = new Date('2026-10-27T16:04:00.000Z');
const live = {
  liveSince: '2026-10-27T16:00:00.000Z',
  endedAt: null,
  inRoom: [{ name: 'أبرار', role: 'teacher' as const }, { role: 'staff' as const }],
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe('the lesson card and the room (boards FamRoomWebJoin / FamRoomWebDoors)', () => {
  it('a live room shows since when and who is inside, with «ادخل الآن»', () => {
    renderPortal(<LessonCard lesson={lesson({ room: live })} student={kid()} />);
    expect(screen.getByText(t.portal.app.live.teacherIn)).toBeTruthy();
    expect(screen.getByText(`أبرار · ${t.portal.app.live.unnamed.staff}`)).toBeTruthy();
    expect(screen.getByText(t.portal.app.live.since.few.replace('{n}', '4'))).toBeTruthy();
    expect(screen.getByRole('button', { name: t.portal.app.live.join })).toBeTruthy();
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('a room ended for everyone says so, with no way back in', () => {
    const ended = { liveSince: null, endedAt: '2026-10-27T16:02:00.000Z', inRoom: [] };
    renderPortal(<LessonCard lesson={lesson({ room: ended })} student={kid()} />);
    expect(screen.getByText(t.classroom.closedHint)).toBeTruthy();
    expect(screen.getByText(/:02/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.portal.join })).toBeNull();
  });

  it('an empty room keeps the clock states and «ادخل الحلقة»', () => {
    renderPortal(<LessonCard lesson={lesson({ room: null })} student={kid()} />);
    expect(screen.getByRole('timer').textContent).toBe(t.portal.now);
    expect(screen.getByRole('button', { name: t.portal.join })).toBeTruthy();
  });
});
