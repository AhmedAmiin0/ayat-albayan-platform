import { ApiError } from '@ab/client-core';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { msg, showBubble } from './bubble.testing';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const a = t.studentChannel.actions;
const pick = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name: a.menu }));
  fireEvent.click(screen.getByRole('button', { name }));
};

describe('channel bubble edit / delete calls', () => {
  afterEach(() => apiSend.mockReset());

  it('«احفظ» PATCHes the trimmed text to the message', async () => {
    apiSend.mockResolvedValue({});
    showBubble(msg(1));
    pick(a.edit);
    fireEvent.change(screen.getByLabelText(a.editTitle), { target: { value: '  بعد غد  ' } });
    fireEvent.click(screen.getByRole('button', { name: a.save }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PATCH', '/teachers/me/channels/s1/messages/m1', {
        body: 'بعد غد',
      }),
    );
  });

  it('«حذف للجميع» asks first, then DELETEs; the admin route for moderation', async () => {
    apiSend.mockResolvedValue({});
    showBubble(msg(1, { mine: false }), 'admin');
    pick(a.deleteForAll);
    expect(screen.getByText(a.moderateBody)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: a.deleteConfirm }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('DELETE', '/students/s1/channel/messages/m1'),
    );
  });

  it("the sender's confirm says it goes for everyone; a refusal is shown in words", async () => {
    apiSend.mockRejectedValue(new ApiError(403, { code: 'delete_window_closed' }));
    showBubble(msg(1), 'portal');
    pick(a.deleteForAll);
    expect(screen.getByText(a.deleteBody)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: a.deleteConfirm }));
    expect(await screen.findByText(a.errors.delete_window_closed)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('DELETE', '/portal/students/s1/channel/messages/m1');
  });
});
