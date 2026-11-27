import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { clearDraft } from '@/features/messaging/inbox/composer/lib/draft-store';
import { message, PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { TextComposer } from './TextComposer';
import { sentText, uid } from '@/features/messaging/inbox/testing/sent-fixture';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend }));

afterEach(() => {
  apiSend.mockReset();
  vi.unstubAllGlobals();
  clearDraft(PHONE);
});

const box = () =>
  screen.getByRole<HTMLTextAreaElement>('textbox', { name: t.inbox.composer.messageLabel });

describe('TextComposer: focus stays in the box (W2)', () => {
  it('after a successful send the box is empty and still focused, ready for the next message', async () => {
    apiSend.mockResolvedValue(sentText({ id: uid('m-1'), status: 'queued' }));
    renderWithClient(<TextComposer phone={PHONE} />);
    fireEvent.change(box(), { target: { value: 'السلام عليكم' } });
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.send }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(document.activeElement).toBe(box()));
    expect(box().value).toBe('');
  });

  it('on a phone width Enter is a new line; Ctrl+Enter still sends', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((media: string) => ({
        matches: media === '(max-width: 39.99rem)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    apiSend.mockResolvedValue(sentText({ id: uid('m-2'), status: 'queued' }));
    renderWithClient(<TextComposer phone={PHONE} />);
    expect(box().getAttribute('placeholder')).toBe(t.inbox.composer.placeholder);
    fireEvent.change(box(), { target: { value: 'سطر' } });
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.keyDown(box(), { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
  });
});
