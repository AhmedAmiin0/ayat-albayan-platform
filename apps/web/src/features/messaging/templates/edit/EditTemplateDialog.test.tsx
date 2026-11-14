import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { EditTemplateDialog } from './EditTemplateDialog';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

// «تعديل» (owner 2026-11-14): Meta's rules on top; a code-bound template changes its words only.

const S = t.templates.edit;
const C = t.templates.create;
const nth = (text: string, n: number) => text.replace('{n}', String(n));
const save = () => fireEvent.click(screen.getByRole('button', { name: S.save }));
const jitsi = { type: 'url' as const, url: 'https://meet.jit.si/{{1}}', text: 'ادخل' };

function open(tpl: ReturnType<typeof template>, mode: 'admin' | 'author' = 'admin') {
  const onSaved = vi.fn();
  const dialog = <EditTemplateDialog tpl={tpl} mode={mode} onSaved={onSaved} onClose={vi.fn()} />;
  renderWithClient(dialog);
  return onSaved;
}

afterEach(() => apiSend.mockReset());

describe('EditTemplateDialog', () => {
  it('shows Meta\'s rules and, for a code-bound template, locks its buttons', () => {
    open(template({ key: 'booking_confirmation', buttons: [jitsi] }));
    expect(screen.getByText(S.limitApproved)).toBeTruthy();
    expect(screen.getByText(S.limitReview)).toBeTruthy();
    expect(screen.getByText(S.codeBound)).toBeTruthy();
    expect(screen.queryByRole('button', { name: C.addReply })).toBeNull();
    expect(screen.queryByRole('button', { name: nth(C.removeFor, 1) })).toBeNull();
    expect(screen.getByLabelText<HTMLInputElement>(nth(C.buttonUrl, 1)).readOnly).toBe(true);
  });

  it('a code-bound template refuses another variable count before it posts', () => {
    open(template({ key: 'booking_confirmation' }));
    fireEvent.change(screen.getByLabelText(C.body), { target: { value: 'حلقة {{1}} اليوم' } });
    save();
    expect(screen.getByText(t.templates.error.code_bound_variables)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('an approved template edited today waits: the save is disabled, the next time shown', () => {
    open(template({ key: 'offer', approved_edits: [new Date().toISOString()] }));
    expect(screen.getByRole<HTMLButtonElement>('button', { name: S.save }).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain(S.nextAt.split('{when}')[0]);
  });

  it('a pending template cannot be edited', () => {
    open(template({ key: 'offer', status: 'pending' }));
    expect(screen.getByText(S.pendingNote)).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: S.save }).disabled).toBe(true);
  });

  it('the author posts plain replies to the author route; the API\'s MSA reason is shown', async () => {
    const tpl = template({ key: 'offer', line: 'chat', sales_starter: true, params: [] });
    const onSaved = open({ ...tpl, body_ar: 'عرض خاص هذا الشهر' }, 'author');
    fireEvent.click(screen.getByRole('button', { name: C.addReply }));
    fireEvent.change(screen.getByLabelText(nth(C.buttonText, 1)), { target: { value: 'نعم' } });
    expect(screen.queryByLabelText(nth(C.buttonIntent, 1))).toBeNull();
    apiSend.mockRejectedValueOnce(new ApiError(409, { code: 'edit_daily_limit', message_ar: 'انتظر' }));
    save();
    expect(await screen.findByText('انتظر')).toBeTruthy();
    apiSend.mockResolvedValueOnce({ ...tpl, status: 'pending' });
    save();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(apiSend).toHaveBeenLastCalledWith('PATCH', '/messaging/templates/authored/offer', {
      body: 'عرض خاص هذا الشهر', footer: 'أكاديمية آيات البيان', params: [],
      buttons: [{ type: 'quick_reply', text: 'نعم' }],
    });
  });
});
