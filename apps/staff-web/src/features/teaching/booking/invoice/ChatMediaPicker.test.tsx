import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t, locale } from '@ab/web-kit';
import { ChatMediaPicker, mediaCardLabel } from './ChatMediaPicker';
import type { ThreadMediaItem } from '@/features/teaching/booking/draft/contract';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale } as const;

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const PHONE = '+966501234567';
const PHOTO: ThreadMediaItem = { message_id: 'a1111111-1111-4111-8111-111111111111', created_at: '2026-10-02T10:00:00.000Z', mime: 'image/jpeg', caption: 'التحويل', expired: false };
const PDF: ThreadMediaItem = { message_id: 'a2222222-2222-4222-8222-222222222222', created_at: '2026-10-01T10:00:00.000Z', mime: 'application/pdf', caption: null, expired: false };
const OLD: ThreadMediaItem = { message_id: 'a3333333-3333-4333-8333-333333333333', created_at: '2026-09-01T10:00:00.000Z', mime: 'image/png', caption: null, expired: true };

function renderPicker(items: ThreadMediaItem[]) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === `/threads/${encodeURIComponent(PHONE)}/media`) return items;
    return { url: `https://signed/${path.split('/').pop()}`, mime: 'image/jpeg', expires_at: '2026-10-03T10:00:00.000Z' };
  });
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ChatMediaPicker phone={PHONE} onPick={onPick} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onPick, onClose };
}

afterEach(() => apiFetch.mockReset());

describe('ChatMediaPicker «من المحادثة» (R-MSG-06)', () => {
  it('lists the family’s files: the photo loads its thumbnail lazily, the PDF is a tile', async () => {
    renderPicker([PHOTO, PDF]);
    const photo = await screen.findByRole('button', { name: mediaCardLabel(PHOTO, C24) });
    expect((await screen.findByRole('img')).getAttribute('src')).toBe('https://signed/a1111111-1111-4111-8111-111111111111');
    expect(photo.textContent).toContain('التحويل');
    expect(screen.getByRole('button', { name: mediaCardLabel(PDF, C24) }).textContent).toContain(t.booking.invoice.pdf);
    expect(apiFetch).toHaveBeenCalledWith('/threads/%2B966501234567/media/a2222222-2222-4222-8222-222222222222');
  });

  it('choosing a photo hands back the message and its preview, a PDF without one', async () => {
    const { onPick } = renderPicker([PHOTO, PDF]);
    await screen.findByRole('img');
    fireEvent.click(screen.getByRole('button', { name: mediaCardLabel(PHOTO, C24) }));
    expect(onPick).toHaveBeenLastCalledWith({ source: 'whatsapp', messageId: 'a1111111-1111-4111-8111-111111111111', mime: 'image/jpeg', preview: 'https://signed/a1111111-1111-4111-8111-111111111111' });
    fireEvent.click(screen.getByRole('button', { name: mediaCardLabel(PDF, C24) }));
    expect(onPick).toHaveBeenLastCalledWith({ source: 'whatsapp', messageId: 'a2222222-2222-4222-8222-222222222222', mime: 'application/pdf', preview: null });
  });

  it('an expired file is disabled with the reason and never fetched', async () => {
    renderPicker([OLD]);
    const card = await screen.findByRole('button', { name: mediaCardLabel(OLD, C24) });
    expect(card.hasAttribute('disabled')).toBe(true);
    expect(card.textContent).toContain(t.booking.invoice.expired);
    expect(apiFetch).not.toHaveBeenCalledWith(expect.stringContaining('a3333333-3333-4333-8333-333333333333'));
  });

  it('says so when the guardian sent nothing, and when the list fails', async () => {
    renderPicker([]);
    expect(await screen.findByText(t.booking.invoice.chatEmpty)).toBeTruthy();
  });

  it('a failed list shows an alert', async () => {
    apiFetch.mockRejectedValue(new Error('down'));
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ChatMediaPicker phone={PHONE} onPick={vi.fn()} onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    expect((await screen.findByRole('alert')).textContent).toBe(t.booking.invoice.chatError);
  });
});
