import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { publicConfigQuery } from '@/lib/public-config';
import { emptyTeacherForm, type SetField, type TeacherForm } from './teacher-form';
import { TeacherMeetingModeField } from './TeacherMeetingModeField';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const T = t.teachers;
const LINK = 'https://meet.google.com/xqa-ngdu-fpe';

function Harness({ start }: { start: Partial<TeacherForm> }) {
  const [form, setForm] = useState<TeacherForm>({ ...emptyTeacherForm(), ...start });
  const set: SetField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  return <TeacherMeetingModeField form={form} set={set} />;
}

/**
 * `auto`: settings.meeting_link_auto; `status`: lesson_join_link's status in GET /messaging/templates
 * ('error': the list fails).
 */
function show(start: Partial<TeacherForm>, { auto = false, status = 'approved' } = {}) {
  apiFetch.mockImplementation((path: string) => {
    if (path !== '/messaging/templates') return Promise.resolve([]);
    return status === 'error' ? Promise.reject(new Error('403')) : Promise.resolve([{ key: 'lesson_join_link', status }]);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: auto });
  render(
    <QueryClientProvider client={client}>
      <Harness start={start} />
    </QueryClientProvider>,
  );
}

const academyLabel = (now: 'platform' | 'static') => `${T.meetingModeOption.academy} ${T.meetingModeResolves[now]}`;

describe('«طريقة حضور الحلقات» in the teacher form (owner 2026-10-19)', () => {
  afterEach(() => apiFetch.mockReset());

  it('offers three options; the academy one says what it resolves to now', () => {
    show({}, { auto: true });
    expect(screen.getByRole('group', { name: T.meetingMode })).toBeTruthy();
    expect(screen.getByRole('radio', { name: academyLabel('platform') })).toHaveProperty('checked', true);
    expect(screen.getByRole('radio', { name: T.meetingModeOption.static })).toBeTruthy();
    expect(screen.getByRole('radio', { name: T.meetingModeOption.platform })).toBeTruthy();
  });

  it('academy switch OFF: the academy option reads «الرابط الثابت»', () => {
    show({ meeting_mode: 'platform', meeting_link: LINK });
    expect(screen.getByRole('radio', { name: academyLabel('static') })).toHaveProperty('checked', false);
    expect(screen.getByRole('radio', { name: T.meetingModeOption.platform })).toHaveProperty('checked', true);
  });

  it('fixed link chosen with no URL: families get no link (a note, not an error)', () => {
    show({ meeting_link: '' }, { auto: true });
    expect(screen.queryByText(T.meetingModeNoLink)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: T.meetingModeOption.static }));
    expect(screen.getByRole('note').textContent).toBe(T.meetingModeNoLink);
  });

  it('platform with lesson_join_link not approved: only the teacher gets the classroom link', async () => {
    show({ meeting_mode: 'platform', meeting_link: '' }, { status: 'pending' });
    expect((await screen.findByRole('note')).textContent).toBe(T.meetingModeTemplatePending);
    expect(screen.queryByText(T.meetingModeNoLink)).toBeNull();
  });

  it('academy default ON resolves to the platform: the template note applies too', async () => {
    show({ meeting_mode: null }, { auto: true, status: 'not_submitted' });
    expect(await screen.findByText(T.meetingModeTemplatePending)).toBeTruthy();
  });

  it('no notes when the link is there or the template is approved', async () => {
    show({ meeting_mode: 'static', meeting_link: LINK }, { auto: true });
    expect(screen.queryByRole('note')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: T.meetingModeOption.platform }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/messaging/templates'));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('no template note while the list fails', async () => {
    show({ meeting_mode: 'platform', meeting_link: LINK }, { status: 'error' });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/messaging/templates'));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText(T.meetingModeTemplatePending)).toBeNull();
  });
});
