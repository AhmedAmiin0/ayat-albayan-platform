import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { clearTabMemories } from '@/features/messaging/inbox/shared/tab-memory';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import {
  box,
  editBar,
  openMenu,
  OWN,
  pickEdit,
  showChat,
} from '@/features/messaging/inbox/testing/correction-harness';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

// Review of PR #694, round 3: a correction is never corrected again (staff correct the original
// once more), and a text that is only the prefix has nothing to send.
const FIRST_FIX = message({
  id: 'fix1',
  direction: 'outbound',
  status: 'sent',
  body: 'تصحيح: The lesson is at six',
  replyable: true,
  sent_by_id: OWN.sent_by_id,
  corrects_id: OWN.id,
  created_at: '2026-10-01T10:00:00Z',
});
const send = () => screen.getByRole('button', { name: t.inbox.composer.send });
const editItems = () => screen.queryAllByRole('button', { name: t.inbox.correction.action });

afterEach(() => {
  apiSend.mockReset();
  clearTabMemories();
});

describe('«تعديل» once per message', () => {
  it('a correction’s menu has no «تعديل»; the greyed original keeps it', () => {
    showChat([OWN, FIRST_FIX]);
    const menus = screen.getAllByRole('button', { name: t.inbox.reply.menu });
    fireEvent.click(menus[menus.length - 1] ?? send());
    expect(editItems().filter((b) => b.getAttribute('aria-disabled') === null)).toEqual([]);
  });

  it('a second correction of the original goes once and is reported sent', async () => {
    const second = { ...FIRST_FIX, id: 'fix2', body: 'تصحيح: The lesson is at seven' };
    apiSend.mockResolvedValue({ ...second, replayed: false });
    showChat([OWN, FIRST_FIX]);
    const menus = screen.getAllByRole('button', { name: t.inbox.reply.menu });
    fireEvent.click(menus[0] ?? send());
    fireEvent.click(editItems()[0] ?? send());
    fireEvent.change(box(), { target: { value: 'The lesson is at seven' } });
    fireEvent.click(send());
    await waitFor(() => expect(editBar()).toBeNull());
    expect(apiSend).toHaveBeenCalledTimes(1);
    expect(apiSend.mock.calls[0]?.[2]).toMatchObject({ correctsId: OWN.id });
    expect(screen.queryByText(t.inbox.error.send_replayed)).toBeNull();
  });

  it('in edit mode a text that is only the prefix cannot be sent', () => {
    showChat();
    pickEdit();
    for (const bare of ['تصحيح:', ' تصحيح:  ', '   ']) {
      fireEvent.change(box(), { target: { value: bare } });
      expect(send().hasAttribute('disabled')).toBe(true);
    }
    fireEvent.change(box(), { target: { value: 'تصحيح: at six' } });
    expect(send().hasAttribute('disabled')).toBe(false);
  });
});

it('outside edit mode «تصحيح:» is a plain text', () => {
  showChat();
  openMenu();
  fireEvent.change(box(), { target: { value: 'تصحيح:' } });
  expect(send().hasAttribute('disabled')).toBe(false);
});
