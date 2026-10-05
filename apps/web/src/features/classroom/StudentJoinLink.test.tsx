import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { StudentJoinLink } from './StudentJoinLink';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const show = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StudentJoinLink studentId="s-1" />
    </QueryClientProvider>,
  );

describe('StudentJoinLink «رابط دخول الطالب»', () => {
  const writeText = vi.fn();
  beforeEach(() => {
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });
  afterEach(() => {
    cleanup();
    apiSend.mockReset();
    writeText.mockReset();
  });

  it('creates the link, copies it and shows it', async () => {
    apiSend.mockResolvedValue({ url: 'https://app.example.test/s/abc' });
    show();
    fireEvent.click(screen.getByRole('button', { name: t.studentLink.create }));
    expect(await screen.findByText(t.studentLink.copied)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/students/s-1/join-link');
    expect(writeText).toHaveBeenCalledWith('https://app.example.test/s/abc');
    expect((screen.getByLabelText(t.studentLink.shown) as HTMLInputElement).value).toBe('https://app.example.test/s/abc');
  });

  it('still shows the URL when the clipboard is blocked, and says so on a failure', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    apiSend.mockResolvedValueOnce({ url: 'https://app.example.test/s/xyz' });
    show();
    fireEvent.click(screen.getByRole('button', { name: t.studentLink.create }));
    expect(await screen.findByDisplayValue('https://app.example.test/s/xyz')).toBeTruthy();
    apiSend.mockRejectedValueOnce(new Error('boom'));
    fireEvent.click(screen.getByRole('button', { name: t.studentLink.create }));
    expect(await screen.findByText(t.studentLink.error)).toBeTruthy();
  });
});
