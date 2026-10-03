import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { ChatMediaPicker, mediaCardLabel } from './ChatMediaPicker';
import type { ThreadMediaItem } from './contract';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const PHONE = '+966501234567';
const PHOTO: ThreadMediaItem = { message_id: 'm-photo', created_at: '2026-10-02T10:00:00.000Z', mime: 'image/jpeg', caption: 'التحويل', expired: false };
const PDF: ThreadMediaItem = { message_id: 'm-pdf', created_at: '2026-10-01T10:00:00.000Z', mime: 'application/pdf', caption: null, expired: false };
const OLD: ThreadMediaItem = { message_id: 'm-old', created_at: '2026-09-01T10:00:00.000Z', mime: 'image/png', caption: null, expired: true };

function renderPicker(items: ThreadMediaItem[]) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === `/threads/${encodeURIComponent(PHONE)}/media`) return items;
    return { url: `https://signed/${path.split('/').pop()}`, mime: 'image/jpeg', expires_at: '2026-10-03T10:00:00.000Z' };
  });
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ChatMediaPicker phone={PHONE} onPick={onPick} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onPick, onClose };
}

afterEach(() => apiFetch.mockReset());

describe('ChatMediaPicker «من الشات» (R-MSG-06)', () => {
  it('lists the family’s files: the photo loads its thumbnail lazily, the PDF is a tile', async () => {
    renderPicker([PHOTO, PDF]);
    const photo = await screen.findByRole('button', { name: mediaCardLabel(PHOTO) });
    expect((await screen.findByRole('img')).getAttribute('src')).toBe('https://signed/m-photo');
    expect(photo.textContent).toContain('التحويل');
    expect(screen.getByRole('button', { name: mediaCardLabel(PDF) }).textContent).toContain(t.booking.invoice.pdf);
    expect(apiFetch).toHaveBeenCalledWith('/threads/%2B966501234567/media/m-pdf');
  });

  it('choosing a photo hands back the message and its preview, a PDF without one', async () => {
    const { onPick } = renderPicker([PHOTO, PDF]);
    await screen.findByRole('img');
    fireEvent.click(screen.getByRole('button', { name: mediaCardLabel(PHOTO) }));
    expect(onPick).toHaveBeenLastCalledWith({ source: 'whatsapp', messageId: 'm-photo', mime: 'image/jpeg', preview: 'https://signed/m-photo' });
    fireEvent.click(screen.getByRole('button', { name: mediaCardLabel(PDF) }));
    expect(onPick).toHaveBeenLastCalledWith({ source: 'whatsapp', messageId: 'm-pdf', mime: 'application/pdf', preview: null });
  });

  it('an expired file is disabled with the reason and never fetched', async () => {
    renderPicker([OLD]);
    const card = await screen.findByRole('button', { name: mediaCardLabel(OLD) });
    expect(card.hasAttribute('disabled')).toBe(true);
    expect(card.textContent).toContain(t.booking.invoice.expired);
    expect(apiFetch).not.toHaveBeenCalledWith(expect.stringContaining('m-old'));
  });

  it('says so when the guardian sent nothing, and when the list fails', async () => {
    renderPicker([]);
    expect(await screen.findByText(t.booking.invoice.chatEmpty)).toBeTruthy();
  });

  it('a failed list shows an alert', async () => {
    apiFetch.mockRejectedValue(new Error('down'));
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ChatMediaPicker phone={PHONE} onPick={vi.fn()} onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    expect((await screen.findByRole('alert')).textContent).toBe(t.booking.invoice.chatError);
  });
});
