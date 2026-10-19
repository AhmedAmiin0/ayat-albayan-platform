import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import type { Teacher } from './api';
import { settle, showMeetingMode } from './meeting-mode-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const T = t.teachers;
const LINK = 'https://meet.google.com/xqa-ngdu-fpe';
const academyLabel = (now: 'platform' | 'static') => `${T.meetingModeOption.academy} ${T.meetingModeResolves[now]}`;
const notes = () => screen.getByRole('status');
const SARA: Teacher = {
  id: 't1', display_name_ar: 'أ. سارة', display_name_en: null, gender: 'female', programs: ['quran'], phone_e164: null,
  meeting_link: null, meeting_mode: null, platform_classroom: true,
  rate_30: null, rate_45: null, rate_60: null, rate_90: null, max_students: null, status: 'active', tz: 'Africa/Cairo',
};

describe('«طريقة حضور الحلقات» in the teacher form (owner 2026-10-19)', () => {
  afterEach(() => apiFetch.mockReset());

  it('offers three options; the academy one says what it resolves to now', () => {
    showMeetingMode(apiFetch, {}, { auto: true });
    expect(screen.getByRole('group', { name: T.meetingMode })).toBeTruthy();
    expect(screen.getByRole('radio', { name: academyLabel('platform') })).toHaveProperty('checked', true);
    expect(screen.getByRole('radio', { name: T.meetingModeOption.static })).toBeTruthy();
    expect(screen.getByRole('radio', { name: T.meetingModeOption.platform })).toBeTruthy();
  });

  it('academy switch OFF: the academy option reads «الرابط الثابت»', () => {
    showMeetingMode(apiFetch, { meeting_mode: 'platform', meeting_link: LINK });
    expect(screen.getByRole('radio', { name: academyLabel('static') })).toHaveProperty('checked', false);
    expect(screen.getByRole('radio', { name: T.meetingModeOption.platform })).toHaveProperty('checked', true);
  });

  it('settings still loading: the bare academy label and no note (not the registry default)', async () => {
    showMeetingMode(apiFetch, { meeting_mode: null, meeting_link: '' }, { auto: 'pending', status: 'not_submitted' });
    expect(screen.getByRole('radio', { name: T.meetingModeOption.academy })).toHaveProperty('checked', true);
    await settle();
    expect(notes().textContent).toBe('');
    expect(apiFetch).not.toHaveBeenCalledWith('/messaging/templates');
  });

  it('settings failed: still no claim about the academy default', async () => {
    showMeetingMode(apiFetch, { meeting_mode: null, meeting_link: '' }, { auto: 'error' });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/settings/public'));
    await settle();
    expect(screen.getByRole('radio', { name: T.meetingModeOption.academy })).toBeTruthy();
    expect(notes().textContent).toBe('');
  });

  it('an academy-mode teacher while the settings load: their resolved mode stands in, as in TeacherFacts', async () => {
    const start = { meeting_mode: null, meeting_link: '' };
    showMeetingMode(apiFetch, start, { auto: 'pending', status: 'not_submitted', teacher: SARA });
    expect(screen.getByRole('radio', { name: academyLabel('platform') })).toHaveProperty('checked', true);
    await waitFor(() => expect(notes().textContent).toContain(T.meetingModeTemplateNotApproved));
  });

  it('a mode chosen in the form needs no setting: its notes show while the settings load', async () => {
    showMeetingMode(apiFetch, { meeting_mode: 'static', meeting_link: '' }, { auto: 'pending', status: 'pending' });
    await waitFor(() => expect(notes().textContent).toBe(T.meetingModeNoLink));
  });

  it('switching to a fixed link with no URL: the note appears in the live region', async () => {
    showMeetingMode(apiFetch, { meeting_link: '' }, { auto: true, status: 'not_submitted' });
    expect(screen.queryByText(T.meetingModeNoLink)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: T.meetingModeOption.static }));
    await waitFor(() => expect(notes().textContent).toBe(T.meetingModeNoLink));
  });

  it('the radio group is described by the always-mounted polite live region', async () => {
    showMeetingMode(apiFetch, { meeting_mode: 'platform' }, { status: 'pending' });
    const region = notes();
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByRole('group', { name: T.meetingMode }).getAttribute('aria-describedby')).toBe(region.id);
    await waitFor(() => expect(region.textContent).toContain(T.meetingModeTemplatePending));
  });
});
