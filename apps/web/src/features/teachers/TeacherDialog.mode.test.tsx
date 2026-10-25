import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { publicConfigQuery } from '@/lib/settings/public-config';
import type { Teacher } from './api';
import { TeacherDialog } from './TeacherDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const T = t.teachers;
const SARA: Teacher = {
  id: 't1', display_name_ar: 'أ. سارة', display_name_en: null, gender: 'female', programs: ['quran'], phone_e164: null,
  meeting_link: 'https://meet.google.com/xqa-ngdu-fpe', meeting_mode: 'platform', platform_classroom: true,
  rate_30: null, rate_45: null, rate_60: null, rate_90: null, max_students: null, status: 'active', tz: 'Africa/Cairo',
};

function open(teacher: Teacher | null) {
  apiFetch.mockResolvedValue([]);
  apiSend.mockResolvedValue({});
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: false });
  render(
    <QueryClientProvider client={client}>
      <TeacherDialog teacher={teacher} onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

const save = () => fireEvent.click(screen.getByRole('button', { name: t.common.save }));
const sent = () => apiSend.mock.calls[0]?.[2] as Record<string, unknown> | undefined;

describe('teacher dialog sends meeting_mode (owner 2026-10-19)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('a new teacher left on the academy default sends null', async () => {
    open(null);
    fireEvent.change(screen.getByLabelText(T.displayNameAr), { target: { value: 'أ. منى' } });
    save();
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/teachers', expect.anything()));
    expect(sent()).toHaveProperty('meeting_mode', null);
  });

  it('editing keeps the teacher mode, and a new choice is sent (the fixed-link note does not block)', async () => {
    open(SARA);
    expect(screen.getByRole('radio', { name: T.meetingModeOption.platform })).toHaveProperty('checked', true);
    fireEvent.change(screen.getByLabelText(T.meetingLink), { target: { value: '' } });
    fireEvent.click(screen.getByRole('radio', { name: T.meetingModeOption.static }));
    // The note waits until the templates and integrations lists answered (no flash on a ready academy).
    expect(await screen.findByText(T.meetingModeNoLink)).toBeTruthy();
    save();
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/teachers/t1', expect.anything()));
    expect(sent()).toMatchObject({ meeting_mode: 'static', meeting_link: null });
  });

  it('back to the academy option sends null', async () => {
    open(SARA);
    fireEvent.click(screen.getByRole('radio', { name: `${T.meetingModeOption.academy} ${T.meetingModeResolves.static}` }));
    save();
    await waitFor(() => expect(sent()).toHaveProperty('meeting_mode', null));
  });
});
