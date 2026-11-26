import { afterEach, describe, expect, it } from 'vitest';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import type { Db } from '@/common/db/db.module';
import { fakeDb } from '@/common/db/testing/fake-db';
import { ChatNumber } from './chat-number';

describe('ChatNumber: the academy chat line from the configured numbers', () => {
  afterEach(() => setNumbersOverlay(null));

  it('module mode: the chat role’s number row', async () => {
    setNumbersOverlay({ values: {}, numberIds: { chat: 'n1' } });
    const f = fakeDb({ wa_numbers: [{ data: { display_phone_e164: '+966511111111' } }] });
    expect(await new ChatNumber(f.db).e164()).toBe('+966511111111');
    expect(f.argsOf('wa_numbers', 'eq')).toEqual(['id', 'n1']);
  });

  it('module mode on one number: the notifications role answers', async () => {
    setNumbersOverlay({ values: {}, numberIds: { notifications: 'n2' } });
    const f = fakeDb({ wa_numbers: [{ data: { display_phone_e164: '+966533333333' } }] });
    expect(await new ChatNumber(f.db).e164()).toBe('+966533333333');
    expect(f.argsOf('wa_numbers', 'eq')).toEqual(['id', 'n2']);
  });

  it('module mode without any number: null, no read', async () => {
    setNumbersOverlay({ values: {}, numberIds: {} });
    const f = fakeDb({});
    expect(await new ChatNumber(f.db).e164()).toBeNull();
    expect(f.calls).toEqual([]);
  });

  it('legacy: a kept line check counts only while its phone id is the line’s', async () => {
    const row = {
      line: 'chat',
      display_phone_e164: '+966522222222',
      verified_name: null,
      checked_at: 'x',
      phone_number_id: 'not-configured',
    };
    const f = fakeDb({ wa_line_health: [{ data: [row] }] });
    expect(await new ChatNumber(f.db).e164()).toBeNull();
    expect(f.argsOf('wa_line_health', 'in')).toEqual(['line', ['chat', 'notifications']]);
  });
});

describe('ChatNumber error paths: the answer a failed query gives today', () => {
  afterEach(() => setNumbersOverlay(null));
  const withChatLine = (db: Db) => {
    setNumbersOverlay({ values: {}, numberIds: { chat: 'n1' } });
    return new ChatNumber(db).e164();
  };

  it('a unique violation is 409 duplicate', async () => {
    const { db } = fakeDb({ wa_numbers: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(withChatLine(db))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ wa_numbers: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(withChatLine(db))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
