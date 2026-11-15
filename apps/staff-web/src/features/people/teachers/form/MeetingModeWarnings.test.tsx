import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { settle, showMeetingMode } from './meeting-mode-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const T = t.teachers;
const LINK = 'https://meet.google.com/xqa-ngdu-fpe';
const notes = () => screen.getByRole('status');
const loaded = async () => {
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/settings/integrations'));
  await settle();
};
const PLATFORM = { meeting_mode: 'platform' as const, meeting_link: '' };

describe('notes under «طريقة حضور الحلقات»', () => {
  afterEach(() => apiFetch.mockReset());

  it('a list without lesson_join_link (restricted) is no proof it is not approved: no note', async () => {
    showMeetingMode(apiFetch, PLATFORM, { status: null });
    await loaded();
    expect(notes().textContent).toBe('');
  });

  it('not approved: who acts next, with a link to the templates in the settings', async () => {
    showMeetingMode(apiFetch, PLATFORM, { status: 'not_submitted' });
    await waitFor(() => expect(notes().textContent).toContain(T.meetingModeTemplateNotApproved));
    const link = screen.getByRole('link', { name: T.meetingModeTemplatesLink });
    expect(link.getAttribute('href')).toBe('/admin/settings/communications?tab=templates');
    expect(notes().textContent).toContain(T.meetingModeTeacherOnly);
  });

  it('pending at Meta: «بانتظار اعتماد Meta» instead', async () => {
    showMeetingMode(apiFetch, PLATFORM, { status: 'pending' });
    await waitFor(() => expect(notes().textContent).toContain(T.meetingModeTemplatePending));
    expect(notes().textContent).not.toContain(T.meetingModeTemplateNotApproved);
  });

  it('platform with LiveKit unset: the server note, and no «the teacher still gets a link» clause', async () => {
    showMeetingMode(apiFetch, PLATFORM, { status: 'not_submitted', livekit: false });
    await waitFor(() => expect(notes().textContent).toContain(T.meetingModeLivekitUnset));
    expect(notes().textContent).toContain(T.meetingModeTemplateNotApproved);
    expect(notes().textContent).not.toContain(T.meetingModeTeacherOnly);
  });

  it('platform with LiveKit unset and the template approved: the server note alone', async () => {
    showMeetingMode(apiFetch, PLATFORM, { livekit: false });
    await waitFor(() => expect(notes().textContent).toBe(T.meetingModeLivekitUnset));
  });

  it('the integrations read fails (forbidden): unknown, so no LiveKit note and no teacher clause', async () => {
    showMeetingMode(apiFetch, PLATFORM, { status: 'pending', livekit: 'error' });
    await waitFor(() => expect(notes().textContent).toContain(T.meetingModeTemplatePending));
    expect(notes().textContent).not.toContain(T.meetingModeLivekitUnset);
    expect(notes().textContent).not.toContain(T.meetingModeTeacherOnly);
  });

  it('fixed link with no URL, template approved and LiveKit set: families get our room, no note', async () => {
    showMeetingMode(apiFetch, { meeting_mode: 'static', meeting_link: '' });
    await loaded();
    expect(notes().textContent).toBe('');
  });

  it('fixed link with no URL while the template is not approved: families get nothing yet', async () => {
    showMeetingMode(apiFetch, { meeting_mode: 'static', meeting_link: '' }, { status: 'pending' });
    await loaded();
    expect(notes().textContent).toBe(T.meetingModeNoLink);
  });

  it('no notes when the link is there, or the platform is fully ready', async () => {
    showMeetingMode(apiFetch, { meeting_mode: 'static', meeting_link: LINK }, { status: 'not_submitted', livekit: false });
    await loaded();
    expect(notes().textContent).toBe('');
  });

  it('platform, template approved and LiveKit set: no note', async () => {
    showMeetingMode(apiFetch, PLATFORM);
    await loaded();
    expect(notes().textContent).toBe('');
  });

  it('no template note while the list fails', async () => {
    showMeetingMode(apiFetch, PLATFORM, { status: 'error' });
    await loaded();
    expect(screen.queryByText(T.meetingModeTemplatePending)).toBeNull();
    expect(notes().textContent).toBe('');
  });
});
