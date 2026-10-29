import type { RegistrationCheckView } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient } from '../testing/test-utils';
import { LinkFamilyDialog } from './LinkFamilyDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const L = t.inbox.linkFamily;
const R = t.registrationCheck;
const FOUND: RegistrationCheckView = {
  found: true,
  more: false,
  matches: [
    { name: 'سهيلة أحمد', code: 'AB-0183', status: 'active', teacher_name: 'أ. أبرار' },
    { name: 'يوسف أحمد', code: 'AB-0184', status: 'trial', teacher_name: null },
  ],
};

function open() {
  const onDone = vi.fn();
  const client = renderWithClient(<LinkFamilyDialog leadId="lead-1" onClose={vi.fn()} onDone={onDone} />);
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  return { onDone, invalidate, dialog: within(screen.getByRole('dialog', { name: L.title })) };
}

async function pickSuhaila(dialog: ReturnType<typeof open>['dialog']) {
  fireEvent.change(dialog.getByLabelText(R.query), { target: { value: ' سهيلة ' } });
  fireEvent.click(screen.getByRole('button', { name: t.common.search }));
  fireEvent.click(await dialog.findByRole('button', { name: /AB-0183/ }));
}

describe('«ربط بطالب موجود» (owner 2026-10-29)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    apiFetch.mockResolvedValue(FOUND);
  });

  it('search by name, pick a child, confirm: POST { code }, the toast text, then the chat and leads refetch', async () => {
    apiSend.mockResolvedValue({ linked: true });
    const { onDone, invalidate, dialog } = open();
    expect(dialog.getByText(L.hint)).toBeTruthy();
    await pickSuhaila(dialog);
    expect(apiFetch).toHaveBeenCalledWith(`/sales/registration-check?q=${encodeURIComponent('سهيلة')}`);
    expect(dialog.getByRole('button', { name: /AB-0183/ }).getAttribute('aria-pressed')).toBe('true');
    expect(dialog.getByText(L.confirm.replace('{name}', 'سهيلة أحمد').replace('{code}', 'AB-0183'))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: L.submit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(L.done));
    expect(apiSend).toHaveBeenCalledWith('POST', '/leads/lead-1/link-family', { code: 'AB-0183' });
    await waitFor(() => expect(invalidate.mock.calls.map(([f]) => f?.queryKey)).toEqual([['threads'], ['leads'], ['sales', 'money']]));
  });

  it('already this family’s number: «مرتبط… من قبل»', async () => {
    apiSend.mockResolvedValue({ linked: false });
    const { onDone, dialog } = open();
    await pickSuhaila(dialog);
    fireEvent.click(screen.getByRole('button', { name: L.submit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(L.already));
  });

  it.each(['number_taken', 'family_has_second_number', 'teacher_number', 'lead_has_family'] as const)(
    'a 409 %s shows its Arabic text and nothing is refetched',
    async (code) => {
      apiSend.mockRejectedValue(new ApiError(409, { code, message: code }));
      const { onDone, invalidate, dialog } = open();
      await pickSuhaila(dialog);
      fireEvent.click(screen.getByRole('button', { name: L.submit }));
      expect(await dialog.findByText(L.errors[code])).toBeTruthy();
      expect(onDone).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
    },
  );

  it('a 403 or a bad body is the generic error; a too-short name is refused before any request', async () => {
    apiSend.mockRejectedValue(new ApiError(403, { message: 'forbidden' }));
    const { dialog } = open();
    fireEvent.change(dialog.getByLabelText(R.query), { target: { value: 'س' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.search }));
    expect(await dialog.findByText(R.error.query_too_short)).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
    await pickSuhaila(dialog);
    fireEvent.click(screen.getByRole('button', { name: L.submit }));
    expect(await dialog.findByText(t.common.error)).toBeTruthy();
  });
});
