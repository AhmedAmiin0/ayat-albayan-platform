import { DEFAULT_HOME_PREFS, HOME_PREFS_KEY } from '@ab/client-core';
import { PUBLIC_SETTING_DEFAULTS, type TeacherMe } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { reloadHomePrefs } from './alerts/home-prefs';
import { TeacherDashboard } from './TeacherDashboard';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));

const ME: TeacherMe = {
  id: 't-abrar', display_name_ar: 'أبرار', gender: 'female', programs: ['quran'], tz: 'Africa/Cairo',
  meeting_link: null, meeting_mode: null, platform_classroom: false, students: [],
};
// Saturday 3 Oct, 12:00 Cairo: one lesson at 16:00 (the hero) and one ended at 10:00.
const NEXT = lesson({ id: 'h', starts_at: '2026-10-03T13:00:00.000Z' });
const ENDED = lesson({ id: 'e', starts_at: '2026-10-03T07:00:00.000Z' });
const ANSWERS: [string, unknown][] = [
  ['/teachers/me/lessons', [NEXT, ENDED]],
  ['/teachers/me', ME],
  ['/settings/public', { ...PUBLIC_SETTING_DEFAULTS, custom: {} }],
];

function renderDash(saved: object) {
  localStorage.setItem(HOME_PREFS_KEY, JSON.stringify({ ...DEFAULT_HOME_PREFS, ...saved }));
  apiFetch.mockImplementation((path: string) =>
    Promise.resolve(ANSWERS.find(([p]) => path.startsWith(p))?.[1] ?? []),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TeacherDashboard />
    </QueryClientProvider>,
  );
}

const openRow = { name: t.lessons.sheet.openRow.replace('{names}', 'سهيلة') };

describe('TeacherDashboard «تخصيص» (owner 2026-11-14)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    reloadHomePrefs();
  });

  it('the defaults: alerts first, then the hero, and the ended fold', async () => {
    renderDash({});
    const alerts = await screen.findByRole('region', { name: t.teacherAlerts.title });
    const hero = await screen.findByRole('region', { name: new RegExp(t.today.next) });
    expect(alerts.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/انتهت حلقة واحدة/)).toBeTruthy();
  });

  it('hero off: its lesson joins the rows; ended off: no fold', async () => {
    renderDash({ hero: false, ended: false });
    expect(await screen.findAllByRole('button', openRow)).toHaveLength(1);
    expect(screen.queryByRole('region', { name: new RegExp(t.today.next) })).toBeNull();
    expect(screen.queryByText(/انتهت حلقة واحدة/)).toBeNull();
  });
});
