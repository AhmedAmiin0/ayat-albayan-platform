import en from '@ab/shared/i18n/en.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AttachmentsDialog } from './AttachmentsDialog';

vi.mock('@/lib/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

describe('«المرفقات», English', () => {
  it('the dialog and its links read in English', async () => {
    apiFetch.mockResolvedValue([
      { id: 'receipt', mime: 'image/jpeg', size: 1, url: 'https://s/r', expires_at: '', legacy: true },
      { id: 'a', mime: 'application/pdf', size: 1, url: 'https://s/a', expires_at: '', legacy: false },
    ]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AttachmentsDialog path="/sales/me/payments/p/attachments" description="Suhaila" onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('dialog', { name: 'Attachments' })).toBeTruthy();
    expect(await screen.findByRole('link', { name: 'Receipt' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Attachment 1' })).toBeTruthy();
  });
});
