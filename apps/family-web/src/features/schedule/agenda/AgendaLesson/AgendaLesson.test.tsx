import { setViewerPersonTz } from '@ab/client-core';
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { kid, lesson, portalApi } from '@ab/web-kit/testing';
import { renderAt } from '@/test/render-at';
import { AgendaLesson } from './AgendaLesson';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const L = t.portal.app.lesson;
const NOW = new Date('2026-11-11T09:00:00.000Z');
const OPEN = lesson({
  starts_at: '2026-11-11T09:05:00.000Z',
  ends_at: '2026-11-11T09:35:00.000Z',
  window: {
    state: 'open',
    opens_at: '2026-11-11T08:55:00.000Z',
    closes_at: '2026-11-11T09:50:00.000Z',
  },
});
const LATER = lesson({
  starts_at: '2026-11-13T10:00:00.000Z',
  ends_at: '2026-11-13T10:45:00.000Z',
  status: 'scheduled',
  family: { counts: false, group: false, request: null },
  window: {
    state: 'early',
    opens_at: '2026-11-13T09:50:00.000Z',
    closes_at: '2026-11-13T11:00:00.000Z',
  },
});

const show = (entry = OPEN, guardian = true) =>
  renderAt(
    <ul>
      <AgendaLesson entry={{ lesson: entry, student: kid() }} guardian={guardian} />
    </ul>,
  );

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
  setViewerPersonTz('Asia/Riyadh');
  apiFetch.mockReset();
  apiFetch.mockImplementation(portalApi());
});

afterEach(() => {
  setViewerPersonTz(null);
  vi.useRealTimers();
});

describe('AgendaLesson', () => {
  it('the time range on the viewer clock, the teacher and the minutes', async () => {
    show();
    const row = await screen.findByRole('listitem');
    expect(row.textContent).toContain('–');
    expect(row.textContent).toContain(L.teacher.replace('{name}', 'أبرار'));
    expect(row.textContent).toContain(L.minutes.replace('{n}', '30'));
  });

  it('its window open: «open now»', async () => {
    show();
    expect(await screen.findByText(L.openNow)).toBeTruthy();
  });

  it('a lesson on a later day: not open yet', async () => {
    show(LATER);
    await screen.findByRole('listitem');
    expect(screen.queryByText(L.openNow)).toBeNull();
  });

  it('a student reads a later lesson only: no action', async () => {
    show(LATER, false);
    await screen.findByRole('listitem');
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('a guardian gets the answer actions for it', async () => {
    show(LATER, true);
    expect((await screen.findAllByRole('button')).length).toBeGreaterThan(0);
  });
});
