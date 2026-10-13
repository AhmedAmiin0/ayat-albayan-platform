import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { meQuery, type Me } from '@/features/auth/me';
import { t } from '@/lib/i18n';
import { InternalMeetingDialog } from './InternalMeetingDialog';

const apiSend = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiSend, apiFetch }));

const L = t.meetings.internal;
const I = t.meetingInvites;
const STAFF_ID = '11111111-1111-4111-8111-111111111111';
const URL = 'https://app.example.test/m/abc';
const writeText = vi.fn();

function open() {
  const onEnter = vi.fn();
  const onClose = vi.fn();
  const client = new QueryClient();
  const me: Me = { id: 'u-1', email: null, role: 'admin', permissions: [] };
  client.setQueryData(meQuery.queryKey, me);
  render(
    <QueryClientProvider client={client}>
      <InternalMeetingDialog onClose={onClose} onEnter={onEnter} />
    </QueryClientProvider>,
  );
  return { onEnter, onClose };
}

describe('InternalMeetingDialog «اجتماع داخلي»', () => {
  beforeEach(() => {
    apiFetch.mockResolvedValue([]);
    Object.assign(navigator, { clipboard: { writeText } });
    writeText.mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    apiSend.mockReset();
    apiFetch.mockReset();
  });

  it('creates with the typed title, shows the link, copies it and enters the room', async () => {
    apiSend.mockResolvedValue({ id: 'm-1', url: URL, invitees: [], replayed: false });
    const { onEnter } = open();
    expect(screen.getByRole('dialog', { name: L.dialogTitle })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(L.title), { target: { value: ' تنسيق الأسبوع ' } });
    fireEvent.click(screen.getByRole('button', { name: L.create }));
    await waitFor(() => expect(screen.getByLabelText(L.link)).toBeTruthy());
    expect(apiSend).toHaveBeenCalledWith('POST', '/meetings', { title: 'تنسيق الأسبوع', clientRequestId: expect.any(String) });
    expect((screen.getByLabelText(L.link) as HTMLInputElement).value).toBe(URL);
    fireEvent.click(screen.getByRole('button', { name: L.copy }));
    await waitFor(() => expect(screen.getByText(L.copied)).toBeTruthy());
    expect(writeText).toHaveBeenCalledWith(URL);
    fireEvent.click(screen.getByRole('button', { name: L.enter }));
    expect(onEnter).toHaveBeenCalledWith('m-1');
  });

  it('sends no title when none is typed; an API failure says so', async () => {
    apiSend.mockRejectedValue(new Error('boom'));
    open();
    fireEvent.click(screen.getByRole('button', { name: L.create }));
    await waitFor(() => expect(screen.getByText(L.error)).toBeTruthy());
    expect(apiSend).toHaveBeenCalledWith('POST', '/meetings', { clientRequestId: expect.any(String) });
  });

  it('adds a typed phone and a team member as invitees; a 409 invite_limit is said in words', async () => {
    apiFetch.mockResolvedValue([{ kind: 'staff', id: STAFF_ID, name: 'أ. سارة', role: 'teacher' }]);
    apiSend.mockRejectedValue(new ApiError(409, { code: 'invite_limit' }));
    open();
    fireEvent.click(await screen.findByRole('button', { name: /أ. سارة|Sara/ }));
    fireEvent.click(screen.getByRole('tab', { name: I.tabs.phone }));
    fireEvent.change(screen.getByLabelText(I.tabs.phone), { target: { value: '+20 100 000 0101' } });
    fireEvent.click(screen.getByRole('button', { name: I.addPhone }));
    expect(screen.getByRole('button', { name: I.removeInvitee.replace('{name}', '+201000000101') })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: L.create }));
    await waitFor(() => expect(screen.getByText(I.errors.invite_limit)).toBeTruthy());
    expect(apiSend).toHaveBeenCalledWith('POST', '/meetings', {
      invitees: [{ kind: 'staff', profileId: STAFF_ID }, { kind: 'phone', phone: '+201000000101' }],
      clientRequestId: expect.any(String),
    });
  });

  it('cancel closes without creating anything', () => {
    const { onClose } = open();
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    expect(onClose).toHaveBeenCalled();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
