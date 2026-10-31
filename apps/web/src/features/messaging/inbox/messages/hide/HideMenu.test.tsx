import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { ADMIN, SALES, showLog, TEACHER } from './hide.testing';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const h = t.inbox.hide;
const M = message({ id: 'm1', body: 'رقم الحساب', replyable: true, forwardable: true });
const openMenu = () => fireEvent.click(screen.getByRole('button', { name: t.inbox.reply.menu }));

describe('«حذف من المنصة» in the bubble menu', () => {
  afterEach(() => apiSend.mockReset());

  it('admin and sales get it; the confirm says it stays on the customer’s phone; POST hides', async () => {
    apiSend.mockResolvedValue({});
    showLog(M, SALES);
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: h.action }));
    expect(screen.getByText(h.title)).toBeTruthy();
    expect(screen.getByText(h.body)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: h.confirm }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/threads/%2B966501234567/messages/m1/hide'),
    );
  });

  it('the admin too', () => {
    showLog(M, ADMIN);
    openMenu();
    expect(screen.getByRole('button', { name: h.action })).toBeTruthy();
  });

  it('a teacher never (teacher mode has no hide)', () => {
    showLog(M, TEACHER);
    openMenu();
    expect(screen.queryByRole('button', { name: h.action })).toBeNull();
  });

  it('ours, not a template: «تعديل» is off, with why (edit from the WhatsApp Business app)', () => {
    showLog(message({ ...M, direction: 'outbound', status: 'sent' }), SALES);
    openMenu();
    const edit = screen.getByRole('button', { name: t.studentChannel.actions.edit });
    expect(edit.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText(h.noEdit)).toBeTruthy();
  });
});
