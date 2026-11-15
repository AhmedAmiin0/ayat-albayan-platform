import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { publicConfigQuery } from '@/lib/settings/public-config';
import { TeacherMeetingLink } from './TeacherMeetingLink';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const LINK = 'https://meet.example.org/abrar-fixed';
const L = t.studentLists;

/**
 * `platform`: SalesTeacherView.platform_classroom (the teacher's mode); `auto`: settings.meeting_link_auto
 * as GET /settings/public answered it, which the section ignores.
 */
function show(link: string | null, { platform = false, auto = false } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: auto });
  render(
    <QueryClientProvider client={client}>
      <TeacherMeetingLink link={link} platform={platform} />
    </QueryClientProvider>,
  );
}

describe('TeacherMeetingLink «رابط الحلقة الثابت» (sales drawer)', () => {
  const writeText = vi.fn();
  beforeEach(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true }));
  afterEach(() => {
    writeText.mockReset();
    apiFetch.mockReset();
  });

  it('shows the URL as an LTR island, copies it and opens it in a new tab', async () => {
    writeText.mockResolvedValue(undefined);
    show(LINK);
    const section = screen.getByRole('region', { name: L.meetingLink });
    expect(screen.getByText(LINK).getAttribute('dir')).toBe('ltr');
    const open = screen.getByRole('link', { name: L.openLink });
    expect(open.getAttribute('href')).toBe(LINK);
    expect(open.getAttribute('target')).toBe('_blank');
    expect(open.getAttribute('rel')).toBe('noopener noreferrer');
    fireEvent.click(screen.getByRole('button', { name: L.copyLink }));
    expect((await screen.findByRole('status')).textContent).toBe(L.copied);
    expect(writeText).toHaveBeenCalledWith(LINK);
    expect(section.textContent).not.toContain(L.meetingLinkAuto);
  });

  it('says so when the clipboard is blocked (the URL stays on screen)', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    show(LINK);
    fireEvent.click(screen.getByRole('button', { name: L.copyLink }));
    expect((await screen.findByRole('status')).textContent).toBe(L.copyFailed);
    expect(screen.getByText(LINK)).toBeTruthy();
  });

  it('no link, or one that is not http(s), reads «لا يوجد رابط ثابت» with nothing to copy or open', () => {
    show(null);
    expect(screen.getByText(L.meetingLinkNone)).toBeTruthy();
    show('javascript:alert(1)');
    expect(screen.getAllByText(L.meetingLinkNone)).toHaveLength(2);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(document.body.textContent).not.toContain('javascript');
  });

  it('teacher on the platform classroom: one line says families get the platform link instead', () => {
    show(LINK, { platform: true });
    expect(screen.getByText(L.meetingLinkAuto)).toBeTruthy();
    expect(screen.getByRole('link', { name: L.openLink })).toBeTruthy();
  });

  it('academy switch ON but the teacher is on the fixed link: no platform line', () => {
    show(LINK, { auto: true });
    expect(screen.queryByText(L.meetingLinkAuto)).toBeNull();
  });
});
