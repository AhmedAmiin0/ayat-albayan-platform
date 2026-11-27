import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { meetingInviteCalls } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const INVITEE = '00000000-0000-4000-8000-000000000002';
const REQ = '00000000-0000-4000-8000-0000000000cc';
const view = {
  id: INVITEE,
  kind: 'staff',
  display_name: 'مريم',
  channel: 'in_app',
  status: 'sent',
  error_code: null,
  sent_at: null,
};
const result = { ...view, link: null, invitation_text: null };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async (_path: string) => answer);
  const apiSend = vi.fn(async (_m: string, _path: string, _body?: unknown) => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('meetingInviteCalls (R-MEET-01..03)', () => {
  it('searches the invitee options and leaves out an empty search', async () => {
    const option = { kind: 'student', id: ID, name: 'ليلى', code: 'AB-0001' };
    const { client, apiFetch } = clientAnswering([option]);
    await expect(meetingInviteCalls(client).options('ل ي')).resolves.toEqual([option]);
    await meetingInviteCalls(client).options('');
    expect(apiFetch.mock.calls.map(([path]) => path)).toEqual([
      '/meetings/invitee-options?q=%D9%84%20%D9%8A',
      '/meetings/invitee-options',
    ]);
  });

  it('reschedules and cancels by the meeting id', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    await meetingInviteCalls(client).update({ id: ID, body: { title: 'جديد' } });
    await meetingInviteCalls(client).cancel(ID);
    expect(apiSend.mock.calls).toEqual([
      ['PATCH', `/meetings/${ID}`, { title: 'جديد' }],
      ['POST', `/meetings/${ID}/cancel`, undefined],
    ]);
  });

  it('lists, adds and resends invitees and refuses an unknown status', async () => {
    const listed = clientAnswering([view]);
    await expect(meetingInviteCalls(listed.client).invitees(ID)).resolves.toEqual([view]);
    expect(listed.apiFetch).toHaveBeenCalledWith(`/meetings/${ID}/invitees`);
    const added = clientAnswering([result]);
    const invitees = [{ kind: 'phone' as const, phone: '+201000000105' }];
    const answer = meetingInviteCalls(added.client).add({ id: ID, invitees });
    await expect(answer).resolves.toEqual([result]);
    expect(added.apiSend).toHaveBeenCalledWith('POST', `/meetings/${ID}/invitees`, { invitees });
    const resent = clientAnswering(result);
    const again = { meetingId: ID, inviteeId: INVITEE, clientRequestId: REQ };
    await meetingInviteCalls(resent.client).resend(again);
    const path = `/meetings/${ID}/invitees/${INVITEE}/resend`;
    expect(resent.apiSend).toHaveBeenCalledWith('POST', path, { clientRequestId: REQ });
    const bad = clientAnswering([{ ...view, status: 'lost' }]);
    await expect(meetingInviteCalls(bad.client).invitees(ID)).rejects.toThrow();
  });
});
