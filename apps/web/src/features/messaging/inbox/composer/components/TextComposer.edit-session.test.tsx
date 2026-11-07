import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { clearTabMemories } from '@/features/messaging/inbox/shared/tab-memory';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { box, editBar, OWN, pickEdit, showChat } from '@/features/messaging/inbox/testing/correction-harness';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

// Follow-up to #694 (items 4, 6): a sent correction ends only the «تعديل» tap it came from, and
// gives the box back the draft it held before that tap.
const FIX = message({ id: 'fix', direction: 'outbound', status: 'queued', body: 'تصحيح: six', corrects_id: OWN.id });
const sendText = (text: string) => {
  fireEvent.change(box(), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.send }));
};

afterEach(() => {
  apiSend.mockReset();
  clearTabMemories();
});

describe('«تعديل»: the edit session', () => {
  it('a sent correction gives the empty box its draft from before the edit', async () => {
    apiSend.mockResolvedValue({ ...FIX, replayed: false });
    showChat();
    fireEvent.change(box(), { target: { value: 'مسودتي' } });
    pickEdit();
    sendText('six');
    await waitFor(() => expect(editBar()).toBeNull());
    expect(box().value).toBe('مسودتي');
  });

  it('«تعديل» again while the first correction is in flight: its success keeps the new edit', async () => {
    let answer: (v: unknown) => void = () => undefined;
    apiSend.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    showChat();
    pickEdit();
    sendText('six');
    pickEdit();
    expect(box().value).toBe(OWN.body);
    await act(async () => answer({ ...FIX, replayed: false }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    expect(editBar()).toBeTruthy();
    expect(box().value).toBe(OWN.body);
  });
});
