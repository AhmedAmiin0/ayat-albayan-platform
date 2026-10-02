import { describe, expect, it } from 'vitest';
import { callsOf, chainDb } from '../reminders/chain-db.fake';
import { FollowUpsQueries } from './follow-ups.queries';

describe('FollowUpsQueries', () => {
  it('candidates: follow-up statuses, not paused, a stage left', async () => {
    const { db, log } = chainDb();
    await new FollowUpsQueries(db).candidates(2);
    expect(callsOf(log, 'leads')).toEqual(
      expect.arrayContaining([
        ['in', ['status', ['interested_no_slot', 'no_reply']]],
        ['eq', ['follow_up_paused', false]],
        ['lt', ['follow_up_stage', 2]],
      ]),
    );
  });

  it('approved: follow_up_slots must be approved in the registry', async () => {
    const yes = chainDb({ message_templates: [{ data: [{ key: 'follow_up_slots' }] }] });
    expect(await new FollowUpsQueries(yes.db).approved()).toBe(true);
    expect(callsOf(yes.log, 'message_templates')).toContainEqual(['eq', ['status', 'approved']]);
    const no = chainDb({ message_templates: [{ data: [] }] });
    expect(await new FollowUpsQueries(no.db).approved()).toBe(false);
  });

  it('advance is a compare-and-set on the stage', async () => {
    const { db, log } = chainDb({ leads: [{ data: [{ id: 'lead-1' }] }, { data: [] }] });
    const queries = new FollowUpsQueries(db);
    const next = new Date('2026-10-04T10:00:00Z');
    expect(await queries.advance({ id: 'lead-1', stage: 0, next })).toBe(true);
    expect(callsOf(log, 'leads')).toEqual([
      ['update', [{ follow_up_stage: 1, next_follow_up_at: '2026-10-04T10:00:00.000Z', follow_up_note: null }]],
      ['eq', ['id', 'lead-1']],
      ['eq', ['follow_up_stage', 0]],
      ['select', ['id']],
    ]);
    expect(await queries.advance({ id: 'lead-1', stage: 0, next: null })).toBe(false);
  });

  it('sync writes the computed due time and the note', async () => {
    const { db, log } = chainDb();
    await new FollowUpsQueries(db).sync('lead-1', { next_follow_up_at: null, follow_up_note: 'no_slots' });
    expect(callsOf(log, 'leads')[0]).toEqual(['update', [{ next_follow_up_at: null, follow_up_note: 'no_slots' }]]);
  });

  it('stageRow reads the row by dedup key; drop deletes only a failed one', async () => {
    const row = { id: 'm1', status: 'failed', error_code: 'expired' };
    const { db, log } = chainDb({ messages: [{ data: row }, { data: null }] });
    const queries = new FollowUpsQueries(db);
    expect(await queries.stageRow('follow_up_slots:lead-1:1:0')).toEqual(row);
    await queries.drop('m1');
    expect(callsOf(log, 'messages')).toContainEqual(['eq', ['dedup_key', 'follow_up_slots:lead-1:1:0']]);
    expect(callsOf(log, 'messages', 1)).toEqual([
      ['delete', []],
      ['eq', ['id', 'm1']],
      ['eq', ['status', 'failed']],
    ]);
  });

  it('activeTeacherIds', async () => {
    const { db } = chainDb({ teachers: [{ data: [{ id: 't-1' }, { id: 't-2' }] }] });
    expect(await new FollowUpsQueries(db).activeTeacherIds()).toEqual(['t-1', 't-2']);
  });
});
