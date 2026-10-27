import { afterEach, describe, expect, it, vi } from 'vitest';
import { setIntegrationOverlay } from '../../../../common/integrations/integration-overlay';
import { PHONE, threadRow } from '../inbox.fakes';
import { NOW, REQ, TARGET_ID, reactionHarness, request, target } from './reaction.fakes';
import { reactionKey } from './thread-reaction.service';

// «تفاعل» (owner 2026-10-27): the guard is the text send's; ours is set at once; ONE idempotent job.
// Fakes only: no line client, no Meta, no Kapso, no CRM.

const TEACHER = { teacherId: 'tch-1', teacherName: 'أبرار', phones: new Set([PHONE]), ownPhone: '+201001234567' };
const TWO_LINES: [string, string][] = [
  ['WA_API_BASE', 'http://wa-stub.test'],
  ['WA_CHAT_PHONE_NUMBER_ID', 'chat-phone'],
  ['WA_CHAT_WABA_ID', 'chat-waba'],
  ['WA_ACCESS_TOKEN', 'token'],
];
const status = (e: unknown) => (e as { getStatus(): number }).getStatus();
const code = (e: unknown) => (e as { getResponse(): { code: string } }).getResponse().code;
const refused = async (p: Promise<unknown>) => p.then(() => null, (e: unknown) => [status(e), code(e)]);

afterEach(() => {
  setIntegrationOverlay({});
  vi.unstubAllEnvs();
});

describe('ThreadReactionService — a reaction', () => {
  it('sets ours at once and queues one reaction row from the chat line, marked for the dispatcher', async () => {
    const h = reactionHarness();
    const { result } = await h.service.react(request(), NOW);
    expect(h.reactions.setOurs).toHaveBeenCalledWith({ targetId: TARGET_ID, phone: PHONE, ours: { emoji: '👍', by: 'a1', at: NOW.toISOString() } });
    expect(h.outbox.send).toHaveBeenCalledTimes(1);
    expect(h.outbox.send).toHaveBeenCalledWith(expect.objectContaining({
      phone_e164: PHONE,
      created_by: 'a1',
      body: '👍',
      dedup_key: `reaction:${TARGET_ID}:👍:admin:${PHONE}:${REQ}`,
      interactive_payload: {
        type: 'reaction',
        reaction: { message_id: 'wamid.T', emoji: '👍' },
        target_id: TARGET_ID,
        previous: { emoji: null, by: null, at: null },
      },
    }));
    expect(result).toMatchObject({ status: 'sent', error_code: null, message: { id: TARGET_ID, reactions: { ours: '👍' } } });
  });

  it('removing ours sends an empty emoji and keeps what it was in `previous`', async () => {
    const h = reactionHarness(target({ our_reaction: '❤️', our_reaction_by: 'a2', our_reaction_at: '2026-10-27T11:30:00Z' }));
    await h.service.react(request({ input: { emoji: null, clientRequestId: REQ } }), NOW);
    expect(h.reactions.setOurs).toHaveBeenCalledWith(expect.objectContaining({ ours: expect.objectContaining({ emoji: null }) }));
    expect(h.outbox.send).toHaveBeenCalledWith(expect.objectContaining({
      body: '',
      interactive_payload: expect.objectContaining({ reaction: { message_id: 'wamid.T', emoji: '' }, previous: { emoji: '❤️', by: 'a2', at: '2026-10-27T11:30:00Z' } }),
    }));
  });

  it('the same request twice is ONE job, and the retry writes nothing', async () => {
    const h = reactionHarness();
    await h.service.react(request(), NOW);
    await h.service.react(request(), NOW);
    expect(h.jobs.size).toBe(1);
    expect(h.reactions.setOurs).toHaveBeenCalledTimes(1);
    expect(reactionKey(request({ input: { emoji: '❤️', clientRequestId: REQ } }))).not.toBe(reactionKey(request()));
  });

  it('a newer tap supersedes older waiting sends to the same message', async () => {
    const h = reactionHarness();
    await h.service.react(request(), NOW);
    expect(h.reactions.supersede).toHaveBeenCalledWith({ targetId: TARGET_ID, phone: PHONE });
  });

  it('nothing queued (the enqueue failed): ours goes back at once and the error goes up', async () => {
    const h = reactionHarness(target({ our_reaction: '❤️', our_reaction_by: 'a2', our_reaction_at: '2026-10-27T11:30:00Z' }));
    h.outbox.send.mockRejectedValueOnce(new Error('db down'));
    await expect(h.service.react(request(), NOW)).rejects.toThrow('db down');
    expect(h.reactions.setOurs).toHaveBeenLastCalledWith({ targetId: TARGET_ID, phone: PHONE, ours: { emoji: '❤️', by: 'a2', at: '2026-10-27T11:30:00Z' } });
    expect(h.row.our_reaction).toBe('❤️');
  });

  it('a failed send comes back failed with its code, and ours is back to what it was', async () => {
    const h = reactionHarness(target(), 'failed');
    const { result } = await h.service.react(request(), NOW);
    expect(result).toMatchObject({ status: 'failed', error_code: '131047', message: { reactions: { ours: null } } });
  });
});

describe('ThreadReactionService — the guard (as a text send)', () => {
  it('a teacher: own families only, never their own chat', async () => {
    const h = reactionHarness();
    expect(await refused(h.service.react(request({ phone: '+966500000077', scope: TEACHER }), NOW))).toEqual([403, 'not_your_thread']);
    const own = { ...TEACHER, phones: new Set([PHONE, TEACHER.ownPhone]) };
    expect(await refused(h.service.react(request({ phone: TEACHER.ownPhone, scope: own }), NOW))).toEqual([403, 'own_thread_read_only']);
    await h.service.react(request({ scope: TEACHER }), NOW);
    expect(h.outbox.send).toHaveBeenCalledWith(expect.objectContaining({ sent_by_teacher_id: 'tch-1', dedup_key: expect.stringContaining('teacher:tch-1:') }));
  });

  it('409 session_closed when the 24 h window is closed; nothing set, nothing queued', async () => {
    const h = reactionHarness();
    h.threads.thread.mockResolvedValue(threadRow({ last_inbound_at: '2026-10-20T00:00:00Z', last_notifications_inbound_at: '2026-10-20T00:00:00Z' }));
    expect(await refused(h.service.react(request(), NOW))).toEqual([409, 'session_closed']);
    expect(h.reactions.setOurs).not.toHaveBeenCalled();
    expect(h.outbox.send).not.toHaveBeenCalled();
  });

  it('the target: in this chat, a WhatsApp message (wamid), at most 30 days old, never a reaction row', async () => {
    expect(await refused(reactionHarness(null).service.react(request(), NOW))).toEqual([404, 'message_not_found']);
    const reactionRow = target({ interactive_payload: { type: 'reaction', reaction: { message_id: 'x', emoji: '👍' } } });
    expect(await refused(reactionHarness(reactionRow).service.react(request(), NOW))).toEqual([404, 'message_not_found']);
    expect(await refused(reactionHarness(target({ wa_message_id: null })).service.react(request(), NOW))).toEqual([409, 'not_reactable']);
    const old = target({ created_at: '2026-09-26T11:00:00Z' });
    expect(await refused(reactionHarness(old).service.react(request(), NOW))).toEqual([409, 'reaction_too_old']);
  });

  it('a wamid of another number than the send line: 409, never a call Meta would refuse', async () => {
    // Two lines: the chat window is open, so the reaction would leave from chat; the target came in on notifications.
    const h = reactionHarness(target({ line: 'notifications' }));
    h.threads.thread.mockResolvedValue(threadRow({ last_chat_inbound_at: '2026-10-27T11:00:00Z' }));
    for (const [k, v] of TWO_LINES) vi.stubEnv(k, v);
    expect(await refused(h.service.react(request(), NOW))).toEqual([409, 'reaction_other_number']);
  });

  it('the CRM line has no reaction call: 409 reaction_unsupported, nothing set or queued', async () => {
    setIntegrationOverlay({ WA_PROVIDER: 'crm' });
    const h = reactionHarness();
    expect(await refused(h.service.react(request(), NOW))).toEqual([409, 'reaction_unsupported']);
    expect(h.reactions.setOurs).not.toHaveBeenCalled();
    expect(h.outbox.send).not.toHaveBeenCalled();
  });
});
