import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient } from '../test-utils';
import { PRICES } from './fixture';
import { ReplyEditorDialog } from './ReplyEditorDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const S = t.savedReplies;
const onClose = vi.fn();
const title = () => screen.getByRole('textbox', { name: new RegExp(S.fieldTitle) });
const body = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: new RegExp(S.fieldBody) });
const save = () => fireEvent.click(screen.getByRole('button', { name: t.common.save }));

afterEach(() => {
  apiSend.mockReset();
  onClose.mockReset();
});

describe('ReplyEditorDialog', () => {
  it('a new reply: title and text required; placeholder chips insert at the caret; POST with its scope', async () => {
    apiSend.mockResolvedValue(PRICES);
    renderWithClient(<ReplyEditorDialog reply={null} scope="shared" onClose={onClose} />);
    save();
    expect(screen.getAllByText(t.common.required)).toHaveLength(2);
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.change(title(), { target: { value: ' ترحيب ' } });
    fireEvent.change(body(), { target: { value: 'أهلًا ' } });
    body().setSelectionRange(6, 6);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(S.placeholders.name) }));
    expect(body().value).toBe('أهلًا {name}');
    save();
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/saved-replies', { scope: 'shared', title: 'ترحيب', body: 'أهلًا {name}' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('editing: shows the file; removing it sends attachment null', async () => {
    apiSend.mockResolvedValue(PRICES);
    renderWithClient(<ReplyEditorDialog reply={PRICES} scope="shared" onClose={onClose} />);
    expect(screen.getByText('الأسعار.pdf')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: S.attachRemove }));
    expect(screen.queryByText('الأسعار.pdf')).toBeNull();
    save();
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PATCH', `/saved-replies/${PRICES.id}`, { title: PRICES.title, body: PRICES.body, attachment: null }),
    );
  });

  it('shows the API\'s refusal inline', async () => {
    const { ApiError } = await import('@/lib/http/api');
    apiSend.mockRejectedValue(new ApiError(403, { code: 'saved_replies_forbidden' }));
    renderWithClient(<ReplyEditorDialog reply={PRICES} scope="shared" onClose={onClose} />);
    save();
    expect((await screen.findByRole('alert')).textContent).toContain(S.errors.saved_replies_forbidden);
    expect(onClose).not.toHaveBeenCalled();
  });
});
