import { describe, expect, it, vi } from 'vitest';
import type { Outbox } from '@/modules/messaging/inbox';
import type { TemplateRegistry } from '@/modules/messaging/whatsapp';
import type {
  LinkUserRow,
  LinkUsersRepo,
} from '@/modules/platform/short-links-admin/managed/link-users.repo';
import type { LinkPeopleRepo } from '@/modules/platform/short-links-admin/people';
import { managedRow } from '@/modules/platform/short-links-admin/short-links-admin.fakes';
import { LinkSend, sendDedupKey, sendFailure } from './link-send';

const NOW = new Date('2026-11-17T12:00:00Z');
const P1 = '00000000-0000-4000-8000-0000000000c1';
const P2 = '00000000-0000-4000-8000-0000000000c2';
const user = (id: string, over: Partial<LinkUserRow>): LinkUserRow => ({
  id,
  code: 'Mg12Cd34Ef',
  profile_id: null,
  phone_e164: null,
  added_by: null,
  send_status: 'not_sent',
  send_error: null,
  send_attempts: 0,
  sent_at: null,
  created_at: NOW.toISOString(),
  ...over,
});

/** Fakes only: nothing ever reaches WhatsApp in a test. */
function setup(approved: boolean) {
  const rows = [
    user('u1', { phone_e164: '+201000000001' }),
    user('u2', { profile_id: P1 }),
    user('u3', { profile_id: P2 }),
  ];
  const users = { users: vi.fn(async () => rows), mark: vi.fn(async () => undefined) };
  const outbox = { queue: vi.fn(async () => ({})) };
  const templates = { approved: vi.fn(async () => (approved ? { key: 'short_link' } : null)) };
  const people = { phonesOf: vi.fn(async () => new Map([[P1, '+201000000002']])) };
  const send = new LinkSend(
    templates as unknown as TemplateRegistry,
    outbox as unknown as Outbox,
    users as unknown as LinkUsersRepo,
    people as unknown as LinkPeopleRepo,
  );
  const link = {
    row: managedRow(),
    shortUrl: 'https://api.example.com/r/Mg12Cd34Ef',
    actorId: 'a1',
  };
  return { send, link, users, outbox, templates };
}

describe('the WhatsApp send of a managed link (template short_link only)', () => {
  it('queues the short_link template to each phone on file, with the title, URL and code', async () => {
    const { send, link, outbox, users, templates } = setup(true);
    expect(await send.sendAll(link, NOW)).toEqual({ queued: 2, failed: 1 });
    expect(templates.approved).toHaveBeenCalledWith('short_link');
    expect(outbox.queue).toHaveBeenCalledTimes(2);
    expect(outbox.queue).toHaveBeenCalledWith(
      expect.objectContaining({
        phone_e164: '+201000000002',
        template_key: 'short_link',
        template_params: { '1': 'رابط التسجيل', '2': link.shortUrl, button: 'Mg12Cd34Ef' },
        dedup_key: 'short_link:Mg12Cd34Ef:u2:1',
      }),
    );
    expect(outbox.queue.mock.calls.flat().every((m) => !('body' in m))).toBe(true);
    expect(users.mark).toHaveBeenCalledWith(
      'u3',
      expect.objectContaining({ send_status: 'failed', send_error: 'no_phone' }),
    );
    expect(users.mark).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ send_status: 'queued', send_attempts: 1 }),
    );
  });

  it('until the template is approved every row is recorded failed; nothing is queued', async () => {
    const { send, link, outbox, users } = setup(false);
    expect(await send.sendAll(link, NOW)).toEqual({ queued: 0, failed: 3 });
    expect(outbox.queue).not.toHaveBeenCalled();
    expect(users.mark).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ send_error: 'template_not_approved' }),
    );
  });

  it('a queue failure fails that row only', async () => {
    const { send, link, outbox } = setup(true);
    outbox.queue.mockRejectedValueOnce(new Error('db down'));
    expect(await send.sendAll(link, NOW)).toEqual({ queued: 1, failed: 2 });
  });

  it('the reasons in order, and one dedup key per attempt (a resend is a new key)', () => {
    expect(sendFailure({ approved: false, phone: null })).toBe('template_not_approved');
    expect(sendFailure({ approved: true, phone: null })).toBe('no_phone');
    expect(sendFailure({ approved: true, phone: '+201000000001' })).toBeNull();
    expect(sendDedupKey('C', user('u1', { send_attempts: 2 }))).toBe('short_link:C:u1:3');
  });
});
