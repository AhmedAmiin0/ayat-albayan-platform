import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { publicConfigQuery } from '@/lib/settings/public-config';
import { scheduleLesson } from '@/features/sales/sales/academy.fixtures';
import { LessonMeetingLink } from './LessonMeetingLink';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const LINK = 'https://meet.example.org/room-with-a-long-name?pwd=abc';
const L = t.studentLists;

function show(over: Parameters<typeof scheduleLesson>[0]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: false });
  render(
    <QueryClientProvider client={client}>
      <LessonMeetingLink lesson={scheduleLesson(over)} />
    </QueryClientProvider>,
  );
}

describe('LessonMeetingLink «رابط الحلقة» (sales lesson details, owner 2026-10-26)', () => {
  const writeText = vi.fn();
  beforeEach(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true }));
  afterEach(() => {
    writeText.mockReset();
    apiFetch.mockReset();
  });

  it('shows the full URL LTR, opens it in a new tab and copies exactly it', async () => {
    writeText.mockResolvedValue(undefined);
    show({ meeting_link: LINK, platform_classroom: false });
    expect(screen.getByText(LINK).getAttribute('dir')).toBe('ltr');
    const open = screen.getByRole('link', { name: L.openLink });
    expect([open.getAttribute('href'), open.getAttribute('target'), open.getAttribute('rel')]).toEqual([LINK, '_blank', 'noopener noreferrer']);
    fireEvent.click(screen.getByRole('button', { name: L.copyLink }));
    expect((await screen.findByRole('status')).textContent).toBe(L.copied);
    expect(writeText).toHaveBeenCalledWith(LINK);
  });

  it('a blocked clipboard says so, the URL stays on screen', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    show({ meeting_link: LINK, platform_classroom: false });
    fireEvent.click(screen.getByRole('button', { name: L.copyLink }));
    expect((await screen.findByRole('status')).textContent).toBe(L.copyFailed);
    expect(screen.getByText(LINK)).toBeTruthy();
  });

  it('our classroom: «عبر الفصل», no URL, no button', () => {
    show({ meeting_link: LINK, platform_classroom: true });
    expect(screen.getByText(t.lessons.viaClassroom)).toBeTruthy();
    expect(screen.queryByText(LINK)).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it.each([null, 'javascript:alert(1)'])('no usable link (%s): «لا يوجد رابط»', (link) => {
    show({ meeting_link: link, platform_classroom: false });
    expect(screen.getByText(t.lessons.noLink)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(document.body.textContent).not.toContain('javascript');
  });
});
