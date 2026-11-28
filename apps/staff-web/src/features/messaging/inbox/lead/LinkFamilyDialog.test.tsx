import type { RegistrationCheckView } from '@ab/shared';
import { formatPhone } from '@ab/core';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, t } from '@ab/web-kit';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { LinkFamilyDialog } from './LinkFamilyDialog';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

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

const PHONE = '+966552220000';

function open() {
  const onDone = vi.fn();
  const client = renderWithClient(
    <LinkFamilyDialog leadId="lead-1" phone={PHONE} onClose={vi.fn()} onDone={onDone} />,
  );
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
    mockApi.reset('read');
    mockApi.reset('write');
    mockApi.onRead(() => FOUND);
  });

  it('search by name, pick a child, confirm: POST { code }, the toast text, then the chat and leads refetch', async () => {
    mockApi.onWrite(() => ({ linked: true }));
    const { onDone, invalidate, dialog } = open();
    expect(dialog.getByText(L.hint)).toBeTruthy();
    // The chat's number under the title, LTR: on a phone the dialog covers the chat.
    expect(dialog.getByText(formatPhone(PHONE)).getAttribute('dir')).toBe('ltr');
    await pickSuhaila(dialog);
    expect(mockApi.reads()).toContainEqual({
      method: 'GET',
      path: `/sales/registration-check?q=${encodeURIComponent('سهيلة')}`,
    });
    expect(dialog.getByRole('button', { name: /AB-0183/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    // The name and the code are bidi islands inside the Arabic sentence.
    const confirm = L.confirm.replace('{name}', 'سهيلة أحمد').replace('{code}', 'AB-0183');
    const line = dialog.getByText((_, el) => el?.tagName === 'P' && el.textContent === confirm);
    expect(within(line).getByText('سهيلة أحمد').tagName).toBe('BDI');
    expect(within(line).getByText('AB-0183').getAttribute('dir')).toBe('ltr');
    fireEvent.click(screen.getByRole('button', { name: L.submit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(L.done));
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: '/leads/lead-1/link-family',
      body: { code: 'AB-0183' },
    });
    await waitFor(() =>
      expect(invalidate.mock.calls.map(([f]) => f?.queryKey)).toEqual([
        ['threads'],
        ['leads'],
        ['sales', 'money'],
      ]),
    );
  });

  it('editing the name after a pick drops it: the footer offers «بحث» again', async () => {
    const { dialog } = open();
    await pickSuhaila(dialog);
    expect(screen.getByRole('button', { name: L.submit })).toBeTruthy();
    fireEvent.change(dialog.getByLabelText(R.query), { target: { value: 'يوسف' } });
    expect(screen.queryByRole('button', { name: L.submit })).toBeNull();
    expect(screen.getByRole('button', { name: t.common.search })).toBeTruthy();
  });

  it('already this family’s number: «مرتبط… من قبل»', async () => {
    mockApi.onWrite(() => ({ linked: false }));
    const { onDone, dialog } = open();
    await pickSuhaila(dialog);
    fireEvent.click(screen.getByRole('button', { name: L.submit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(L.already));
  });

  it.each([
    'number_taken',
    'family_has_second_number',
    'teacher_number',
    'lead_has_family',
  ] as const)('a 409 %s shows its Arabic text and nothing is refetched', async (code) => {
    mockApi.onWrite(() => Promise.reject(new ApiError(409, { code, message: code })));
    const { onDone, invalidate, dialog } = open();
    await pickSuhaila(dialog);
    fireEvent.click(screen.getByRole('button', { name: L.submit }));
    expect(await dialog.findByText(L.errors[code])).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('a 403 or a bad body is the generic error; a too-short name is refused before any request', async () => {
    mockApi.onWrite(() => Promise.reject(new ApiError(403, { message: 'forbidden' })));
    const { dialog } = open();
    fireEvent.change(dialog.getByLabelText(R.query), { target: { value: 'س' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.search }));
    expect(await dialog.findByText(R.error.query_too_short)).toBeTruthy();
    expect(mockApi.reads()).toHaveLength(0);
    await pickSuhaila(dialog);
    fireEvent.click(screen.getByRole('button', { name: L.submit }));
    expect(await dialog.findByText(t.common.error)).toBeTruthy();
  });
});
