import { describe, expect, it } from 'vitest';
import type { TablesInsert } from '@ab/db';
import { NOW, reactionHarness, request, target } from './reaction.fakes';

// Review of #332: sales never react to (or read back) a feedback request or a join link (migration 187),
// and a failure after the row was queued does not put ours back (the sender decides).

const SALES = { salesId: 'a1' } as never;
const refused = async (p: Promise<unknown>) =>
  p.then(() => null, (e: unknown) => [(e as { getStatus(): number }).getStatus(), (e as { getResponse(): { code: string } }).getResponse().code]);

describe('ThreadReactionService — sales and link templates', () => {
  it.each(['lesson_feedback_request', 'lesson_join_link'])('a salesperson reacting to %s: 404, nothing written or sent', async (key) => {
    const h = reactionHarness(target({ template_key: key }));
    expect(await refused(h.service.react(request({ sales: SALES }), NOW))).toEqual([404, 'message_not_found']);
    expect(h.reactions.setOurs).not.toHaveBeenCalled();
    expect(h.outbox.send).not.toHaveBeenCalled();
  });

  it('the admin may still react to a link template', async () => {
    const h = reactionHarness(target({ template_key: 'lesson_feedback_request' }));
    await h.service.react(request(), NOW);
    expect(h.outbox.send).toHaveBeenCalledTimes(1);
  });

  it('a salesperson’s answer never carries a link template’s params', async () => {
    const h = reactionHarness();
    Object.assign(h.row, { template_key: 'lesson_join_link', template_params: { button: 'signed-token' } });
    const { result } = await h.service.react(request({ sales: SALES }), NOW);
    expect(result.message.template_params).toBeNull();
  });
});

describe('ThreadReactionService — a failure after the row was queued', () => {
  it('keeps ours (the sender decides); a failure before the queue puts it back', async () => {
    const h = reactionHarness();
    h.outbox.send.mockImplementationOnce(async (job: TablesInsert<'messages'>) => {
      h.jobs.set(job.dedup_key ?? '', job);
      throw new Error('read back failed');
    });
    await expect(h.service.react(request(), NOW)).rejects.toThrow('read back failed');
    expect(h.reactions.setOurs).toHaveBeenCalledTimes(1); // the optimistic set only, no revert

    const g = reactionHarness();
    g.outbox.send.mockRejectedValueOnce(new Error('insert failed'));
    await expect(g.service.react(request(), NOW)).rejects.toThrow('insert failed');
    expect(g.reactions.setOurs).toHaveBeenCalledTimes(2); // set, then put back
  });
});
