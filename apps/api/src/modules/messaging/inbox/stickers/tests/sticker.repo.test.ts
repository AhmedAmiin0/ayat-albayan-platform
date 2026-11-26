import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { StickerRepo } from '@/modules/messaging/inbox/stickers/sticker.repo';

const FAVOURITE = { profile_id: 'u1', sticker_key: 'k1' };

describe('StickerRepo errors answer through the default db error map', () => {
  it('a failed read is a 500 that names the db error', async () => {
    const { db } = fakeDb({ messages: [{ error: PG_ERRORS.other }] });
    await expect(new StickerRepo(db).recent()).rejects.toThrow('db error XX000: boom');
  });

  it('a unique or foreign key clash on a favourite write is a 409', async () => {
    const { db } = fakeDb({
      sticker_favourites: [{ error: PG_ERRORS.unique }, { error: PG_ERRORS.foreignKey }],
    });
    const save = new StickerRepo(db).save({ ...FAVOURITE, message_id: 'm1' });
    expect((await answerOfRejection(save)).status).toBe(409);
    expect((await answerOfRejection(new StickerRepo(db).drop(FAVOURITE))).status).toBe(409);
  });
});
