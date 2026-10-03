import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { CopyLinkButton } from './CopyLinkButton';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const show = (status = 'confirmed') =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CopyLinkButton lesson={{ id: 'l-1', status: status as 'confirmed' }} />
    </QueryClientProvider>,
  );

describe('CopyLinkButton («انسخ رابط الطالب»)', () => {
  const writeText = vi.fn();
  beforeEach(() => {
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });
  afterEach(() => {
    apiSend.mockReset();
    writeText.mockReset();
  });

  it('asks for a fresh link, copies it and shows it', async () => {
    apiSend.mockResolvedValue({ url: 'https://app.example.test/join/abc', expires_at: '2026-10-05T19:00:00Z' });
    show();
    fireEvent.click(screen.getByRole('button', { name: t.classroom.copyLink }));
    expect(await screen.findByText(t.classroom.copied)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/l-1/join-link/url');
    expect(writeText).toHaveBeenCalledWith('https://app.example.test/join/abc');
    expect((screen.getByLabelText(t.classroom.linkShown) as HTMLInputElement).value).toBe('https://app.example.test/join/abc');
  });

  it('still shows the URL when the clipboard is blocked', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    apiSend.mockResolvedValue({ url: 'https://app.example.test/join/xyz', expires_at: 'x' });
    show();
    fireEvent.click(screen.getByRole('button', { name: t.classroom.copyLink }));
    expect(await screen.findByDisplayValue('https://app.example.test/join/xyz')).toBeTruthy();
  });

  it('shows the error when the API refuses', async () => {
    apiSend.mockRejectedValue(new Error('x'));
    show();
    fireEvent.click(screen.getByRole('button', { name: t.classroom.copyLink }));
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('is not offered for a cancelled lesson', () => {
    show('cancelled_by_admin');
    expect(screen.queryByRole('button', { name: t.classroom.copyLink })).toBeNull();
  });
});
