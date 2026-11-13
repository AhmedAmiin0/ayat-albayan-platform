import type { TeacherMe } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { setTeacherPages } from '@/lib/settings/teacher-pages-testing';
import { TeacherDashboard } from './TeacherDashboard';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

const ME: TeacherMe = {
  id: 't-1', display_name_ar: 'معلمة', gender: 'female', programs: ['quran'], tz: 'Africa/Cairo',
  meeting_link: null, meeting_mode: null, platform_classroom: true, students: [],
};
const INSTANT = t.meetings.internal.item;
const SCHEDULED = t.meetingInvites.scheduledItem;

function renderDash(patch: Record<string, boolean>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  setTeacherPages(client, false, patch);
  render(
    <QueryClientProvider client={client}>
      <TeacherDashboard />
    </QueryClientProvider>,
  );
}

const button = (name: string) => screen.queryByRole('button', { name: new RegExp(name) });

describe('TeacherDashboard meetings follow «صفحات المعلم» (owner 2026-11-13)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockImplementation((path: string) => Promise.resolve(path === '/teachers/me' ? ME : []));
  });

  it('both switches off: no meeting button and no meetings list', async () => {
    renderDash({});
    await screen.findByRole('tablist');
    expect(button(INSTANT)).toBeNull();
    expect(button(SCHEDULED)).toBeNull();
    expect(screen.queryByRole('region', { name: t.meetings.internal.list })).toBeNull();
    expect(apiFetch.mock.calls.some((c) => c[0] === '/meetings')).toBe(false);
  });

  it('only «اجتماع داخلي» on: the instant button and the list, no scheduled button', async () => {
    renderDash({ teacher_internal_meetings_enabled: true });
    await screen.findByRole('tablist');
    expect(button(INSTANT)).toBeTruthy();
    expect(button(SCHEDULED)).toBeNull();
    await waitFor(() => expect(apiFetch.mock.calls.some((c) => c[0] === '/meetings')).toBe(true));
  });

  it('only «اجتماع مجدول» on: the scheduled button alone', async () => {
    renderDash({ teacher_scheduled_meetings_enabled: true });
    await screen.findByRole('tablist');
    expect(button(INSTANT)).toBeNull();
    expect(button(SCHEDULED)).toBeTruthy();
  });
});
