import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { NewMeetingMenu } from './NewMeetingMenu';

vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/dashboard/link-mock')).Link,
}));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(async () => []) }));

const show = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NewMeetingMenu />
    </QueryClientProvider>,
  );

describe('NewMeetingMenu «اجتماع جديد»', () => {
  afterEach(cleanup);

  it('offers «اجتماع داخلي» first, then «اجتماع مجدول», «ابدأ الآن» and «جدولة» (the booking wizard)', () => {
    show();
    expect(screen.getByText(t.meetings.new)).toBeTruthy();
    const items = screen.getByRole('group', { name: t.meetings.new }).children;
    expect(items[0]?.textContent).toBe(t.meetings.internal.item);
    expect(items[1]?.textContent).toBe(t.meetingInvites.scheduledItem);
    expect(screen.getByRole('button', { name: t.meetings.startNow })).toBeTruthy();
    expect(screen.getByRole('link', { name: t.meetings.schedule }).getAttribute('href')).toBe('/admin/book');
  });

  it('«جدولة» closes the menu as it routes to the booking wizard', () => {
    show();
    const menu = screen.getByText(t.meetings.new).closest('details');
    menu?.setAttribute('open', '');
    fireEvent.click(screen.getByRole('link', { name: t.meetings.schedule }));
    expect(menu?.hasAttribute('open')).toBe(false);
  });

  it('«ابدأ الآن» opens the instant lesson dialog, and cancel closes it', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: t.meetings.startNow }));
    expect(screen.getByRole('dialog', { name: t.meetings.dialogTitle })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('«اجتماع داخلي» opens the internal meeting dialog (no students, no teacher)', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: t.meetings.internal.item }));
    expect(screen.getByRole('dialog', { name: t.meetings.internal.dialogTitle })).toBeTruthy();
    expect(screen.queryByRole('region', { name: t.meetings.students })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('«اجتماع مجدول» opens the scheduled meeting dialog (date, time, duration, invitees)', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: t.meetingInvites.scheduledItem }));
    expect(screen.getByRole('dialog', { name: t.meetingInvites.scheduleTitle })).toBeTruthy();
    expect(screen.getByLabelText(t.meetingInvites.date)).toBeTruthy();
    expect(screen.getByRole('region', { name: t.meetingInvites.invitees })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is the filled primary by default, and an outline button beside another primary', () => {
    const { unmount } = show();
    expect(screen.getByText(t.meetings.new).closest('summary')?.className).toContain('bg-primary');
    unmount();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <NewMeetingMenu variant="secondary" />
      </QueryClientProvider>,
    );
    const summary = screen.getByText(t.meetings.new).closest('summary');
    expect(summary?.className).toContain('bg-secondary');
    expect(summary?.className).not.toContain('bg-primary');
  });
});
