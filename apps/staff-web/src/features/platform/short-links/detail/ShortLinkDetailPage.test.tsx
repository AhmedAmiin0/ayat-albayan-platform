import { fillSlots } from '@ab/client-core';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, t, renderWithClient } from '@ab/web-kit';
import { linkDetail } from '@/features/platform/short-links/shared/short-links.fixtures';
import { ShortLinkDetailPage } from './ShortLinkDetailPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  apiFetch,
  apiSend,
}));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

const D = t.shortLinks.detail;

async function open(link = linkDetail()) {
  apiFetch.mockResolvedValue(link);
  renderWithClient(<ShortLinkDetailPage section="admin" code={link.code} />);
  await screen.findByRole('heading', { level: 1, name: link.title });
}

afterEach(() => vi.clearAllMocks());

describe('ShortLinkDetailPage', () => {
  it('shows the QR, the short URL, the users with their sends and the visitors', async () => {
    await open();
    const back = screen.getByRole('link', { name: D.back });
    expect(back.getAttribute('href')).toBe('/admin/short-links');
    const qr = screen.getByRole('img', { name: D.qr });
    expect(qr.querySelector('path')?.getAttribute('d')).toMatch(/^M\d/);
    expect(qr.getAttribute('viewBox')).toMatch(/^0 0 \d+ \d+$/);
    expect(screen.getByText('app.ayatalbayan.com/l/K7q2M9xT')).toBeTruthy();
    const users = screen.getByRole('table', { name: D.users });
    expect(within(users).getByText('عمر سعيد')).toBeTruthy();
    expect(within(users).getByText(D.sendErrors.template_not_approved)).toBeTruthy();
    expect(within(users).getByText(D.notOpenedYet)).toBeTruthy();
    const visitors = screen.getByRole('table', { name: D.visitorLog });
    expect(within(visitors).getByText(D.via.whatsapp)).toBeTruthy();
  });

  it('«أعد الإرسال لمن فشل» resends and reports the counts', async () => {
    apiSend.mockResolvedValue({ ...linkDetail(), send: { queued: 0, failed: 1 } });
    await open();
    fireEvent.click(screen.getByRole('button', { name: fillSlots(D.resendFailed, { n: 1 }) }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/short-links/K7q2M9xT/resend', undefined),
    );
    expect(await screen.findByText(fillSlots(D.sendResult, { queued: 0, failed: 1 }))).toBeTruthy();
  });

  it('revoke asks first, then stops the link', async () => {
    apiSend.mockResolvedValue(linkDetail({ status: 'revoked' }));
    await open();
    fireEvent.click(screen.getByRole('button', { name: D.revoke }));
    const dialog = screen.getByRole('dialog', { name: D.revokeTitle });
    expect(within(dialog).getByText(D.revokeBody)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: D.revokeConfirm }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/short-links/K7q2M9xT/revoke', undefined),
    );
    expect(await screen.findByText(D.revoked)).toBeTruthy();
  });

  it('a refused revoke keeps the dialog open with the reason', async () => {
    apiSend.mockRejectedValue(new ApiError(404, { code: 'short_link_not_found' }));
    await open();
    fireEvent.click(screen.getByRole('button', { name: D.revoke }));
    fireEvent.click(screen.getByRole('button', { name: D.revokeConfirm }));
    expect(await screen.findByText(D.errors.not_found)).toBeTruthy();
  });

  it('«تمديد» sends a new expiry', async () => {
    apiSend.mockResolvedValue(linkDetail());
    await open();
    fireEvent.click(screen.getByRole('button', { name: D.extend }));
    fireEvent.click(screen.getByRole('button', { name: D.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalled());
    const [method, path, body] = apiSend.mock.calls[0] ?? [];
    expect([method, path]).toEqual(['PATCH', '/short-links/K7q2M9xT']);
    expect(Object.keys(body as object)).toEqual(['expiresAt']);
  });

  it('«تعديل» sends the title, the limit and the user list', async () => {
    apiSend.mockResolvedValue(linkDetail());
    await open();
    fireEvent.click(screen.getByRole('button', { name: t.common.edit }));
    const dialog = screen.getByRole('dialog', { name: t.common.edit });
    const title = within(dialog).getByLabelText(new RegExp(`^${t.shortLinks.form.titleLabel}`));
    fireEvent.change(title, { target: { value: 'لقاء جديد' } });
    fireEvent.click(within(dialog).getByRole('button', { name: D.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalled());
    expect(apiSend.mock.calls[0]?.[2]).toMatchObject({
      title: 'لقاء جديد',
      maxUsers: 12,
      phones: ['+201120000003'],
    });
  });

  it('a revoked link has no actions', async () => {
    await open(linkDetail({ status: 'revoked' }));
    expect(screen.queryByRole('button', { name: D.revoke })).toBeNull();
    expect(screen.queryByRole('button', { name: D.resend })).toBeNull();
  });

  it('a missing link says so', async () => {
    apiFetch.mockRejectedValue(new ApiError(404, { code: 'short_link_not_found' }));
    renderWithClient(<ShortLinkDetailPage section="sales" code="Nope1234" />);
    expect(await screen.findByText(D.errors.not_found)).toBeTruthy();
  });
});
