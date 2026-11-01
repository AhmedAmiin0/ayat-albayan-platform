import { ApiError } from '@ab/client-core';
import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { publicConfigQuery } from '@/lib/settings/public-config';
import type { Teacher } from '@/features/people/teachers/api';
import { TeacherDialog } from './TeacherDialog';

// «اسم المستخدم» of the teacher's login (docs/30 §7).

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const U = t.familyAuth.teacherUsername;
const OMAR: Teacher = {
  id: 't1', display_name_ar: 'أ. عمر', display_name_en: null, gender: 'male', programs: ['quran'], phone_e164: null,
  meeting_link: null, meeting_mode: null, platform_classroom: false, rate_30: null, rate_45: null, rate_60: null,
  rate_90: null, max_students: null, status: 'active', tz: 'Africa/Cairo', profile_id: 'p1', username: 'omar',
};

function show(teacher: Teacher | null) {
  apiFetch.mockResolvedValue([]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: false });
  render(<QueryClientProvider client={client}><TeacherDialog teacher={teacher} onClose={vi.fn()} /></QueryClientProvider>);
}

const field = () => screen.getByLabelText<HTMLInputElement>(U.label);
const type = (value: string) => fireEvent.change(field(), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: t.common.save }));
const body = () => apiSend.mock.calls[0]?.[2] as Record<string, unknown> | undefined;

describe('teacher dialog: username (docs/30)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('is not on the create form', () => {
    show(null);
    expect(screen.queryByLabelText(U.label)).toBeNull();
  });

  it('is shown LTR with the hint, and lower-cased on blur', () => {
    show(OMAR);
    expect(field().value).toBe('omar');
    expect(field().getAttribute('dir')).toBe('ltr');
    expect(field().getAttribute('autocapitalize')).toBe('off');
    expect(screen.getByText(U.hint)).toBeTruthy();
    type(' Ustadh.Omar ');
    fireEvent.blur(field());
    expect(field().value).toBe('ustadh.omar');
  });

  it('is disabled with the needs-login note when the teacher has no login', () => {
    show({ ...OMAR, profile_id: null, username: null });
    expect(field().disabled).toBe(true);
    expect(screen.getByText(U.needsLogin)).toBeTruthy();
  });

  it('sends the lower-cased username only when it changed', async () => {
    apiSend.mockResolvedValue(OMAR);
    show(OMAR);
    save();
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    expect(body()).not.toHaveProperty('username');
    apiSend.mockClear();
    type('Ustadh.Omar');
    save();
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    expect(body()).toHaveProperty('username', 'ustadh.omar');
  });

  it('sends null when cleared', async () => {
    apiSend.mockResolvedValue(OMAR);
    show(OMAR);
    type('');
    save();
    await waitFor(() => expect(body()).toHaveProperty('username', null));
  });

  it('an invalid username is not sent', () => {
    show(OMAR);
    type('AB-1234');
    save();
    expect(screen.getByText(U.invalid)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it.each([
    ['username_taken', U.taken],
    ['username_needs_login', U.needsLogin],
  ])('409 %s shows its text', async (code, text) => {
    apiSend.mockRejectedValue(new ApiError(409, { code, message: code }));
    show(OMAR);
    type('omar2');
    save();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining(text));
  });
});
