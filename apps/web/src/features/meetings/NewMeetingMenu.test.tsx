import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { NewMeetingMenu } from './NewMeetingMenu';

const show = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NewMeetingMenu />
    </QueryClientProvider>,
  );

describe('NewMeetingMenu «اجتماع جديد»', () => {
  afterEach(cleanup);

  it('offers «اجتماع داخلي» first, then «ابدأ الآن» and «جدولة» (the booking wizard)', () => {
    show();
    expect(screen.getByText(t.meetings.new)).toBeTruthy();
    const items = screen.getByRole('group', { name: t.meetings.new }).children;
    expect(items[0]?.textContent).toBe(t.meetings.internal.item);
    expect(screen.getByRole('button', { name: t.meetings.startNow })).toBeTruthy();
    expect(screen.getByRole('link', { name: t.meetings.schedule }).getAttribute('href')).toBe('/admin/book');
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
    expect(screen.queryByText(t.meetings.students)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
