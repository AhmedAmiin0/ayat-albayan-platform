import { describe, expect, it } from 'vitest';
import { event, GUARDIAN_ID, LESSON_ID, nobody, services } from './webhook.fakes';

// A quick reply that fails: unstore the row only while Meta still waits for the answer.
function guardianYes() {
  const s = services();
  s.queries.identify.mockResolvedValue({ ...nobody(), guardian: { id: GUARDIAN_ID, name: 'أم سهيلة' } });
  s.queries.recentLessonOutbound.mockResolvedValue(LESSON_ID);
  s.lessons.confirm.mockRejectedValueOnce(new Error('db: connection refused'));
  return s;
}

describe('InboundService — a failed quick reply and the response deadline', () => {
  it('within the budget: the row is unstored so Meta’s re-send runs it again', async () => {
    const s = guardianYes();
    const deadline = Date.now() + 5_000;
    await expect(s.inbound.handle(event({ body: 'نعم' }), { deadline })).rejects.toThrow('connection refused');
    expect(s.queries.deleteInbound).toHaveBeenCalledWith('wamid.IN1');
    expect(s.queries.stored).toEqual([]);
  });

  it('past the budget (Meta already has its 200): the row stays in the inbox', async () => {
    const s = guardianYes();
    const deadline = Date.now() - 1;
    await expect(s.inbound.handle(event({ body: 'نعم' }), { deadline })).rejects.toThrow('connection refused');
    expect(s.queries.deleteInbound).not.toHaveBeenCalled();
    expect(s.queries.stored).toHaveLength(1);
    expect(s.push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('too close to the deadline for a DELETE to land first: the row stays', async () => {
    const s = guardianYes();
    await expect(s.inbound.handle(event({ body: 'نعم' }), { deadline: Date.now() + 100 })).rejects.toThrow();
    expect(s.queries.deleteInbound).not.toHaveBeenCalled();
    expect(s.queries.stored).toHaveLength(1);
  });

  it('an unstore that fails too: the quick reply’s error goes up, not the delete’s', async () => {
    const s = guardianYes();
    s.queries.deleteInbound.mockRejectedValueOnce(new Error('db: gone'));
    await expect(s.inbound.handle(event({ body: 'نعم' }))).rejects.toThrow('connection refused');
    expect(s.queries.stored).toHaveLength(1);
  });
});
