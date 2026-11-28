import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { clearTabMemories } from '@/features/messaging/inbox/shared/tab-memory';
import { sentText, uid } from '@/features/messaging/inbox/testing/sent-fixture';
import { box, editBar, OWN, pickEdit, showChat } from '@/features/messaging/inbox/testing/correction-harness';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

// A sent correction ends only the edit tap it came from and restores the draft held before it.
const FIX = sentText({ id: uid('fix'), body: 'تصحيح: six', corrects_id: OWN.id });
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
    apiSend.mockResolvedValue(FIX);
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
    await act(async () => answer(FIX));
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    expect(editBar()).toBeTruthy();
    expect(box().value).toBe(OWN.body);
  });
});
