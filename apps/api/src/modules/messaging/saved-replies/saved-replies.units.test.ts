import { systemPermissionsOf, type UserRole } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../../../common/auth/verify-token';
import { row } from './saved-replies.fakes';
import { assertRepliesUser, managesShared, replyIdParam } from './saved-replies.guard';
import { toSavedReply } from './saved-replies.mapper';
import { movedOrder } from './saved-replies.order';
import { isSavedReplyPathOf, savedReplyPath } from './saved-replies.paths';

const as = (role: UserRole, permissions = systemPermissionsOf(role)): AuthUser => ({ id: 'u', email: null, role, permissions });
const status = (run: () => unknown) => {
  try {
    run();
    return 'ok';
  } catch (e) {
    return (e as { getStatus?: () => number }).getStatus?.();
  }
};

describe('guard', () => {
  it('lets the admin and sales in, never a teacher; sales without inbox.read is out', () => {
    expect([status(() => assertRepliesUser(as('admin'))), status(() => assertRepliesUser(as('sales')))]).toEqual(['ok', 'ok']);
    expect(status(() => assertRepliesUser(as('teacher', [...systemPermissionsOf('teacher'), 'saved_replies.manage'])))).toBe(403);
    expect(status(() => assertRepliesUser(as('sales', systemPermissionsOf('sales').filter((p) => p !== 'inbox.read'))))).toBe(403);
  });

  it('only the admin manages the shared list by default', () => {
    expect([managesShared(as('admin')), managesShared(as('sales'))]).toEqual([true, false]);
  });

  it('a malformed id is 404', () => {
    expect(status(() => replyIdParam('x'))).toBe(404);
  });
});

describe('paths', () => {
  it('builds saved/{actor}/{uuid}.{ext} and accepts only that actor\'s', () => {
    const path = savedReplyPath({ actorId: 's1', mime: 'image/png' });
    expect(path).toMatch(/^saved\/s1\/[0-9a-f-]{36}\.png$/);
    expect([isSavedReplyPathOf(path, 's1'), isSavedReplyPathOf(path, 's2')]).toEqual([true, false]);
    expect(['saved/s1/..', 'saved/s1/a/b.pdf', 'out/s1/x.pdf', 'saved/s1/'].map((p) => isSavedReplyPathOf(p, 's1'))).toEqual([false, false, false, false]);
  });
});

describe('movedOrder', () => {
  const rows = [row({ n: 1, position: 0 }), row({ n: 2, position: 0, title: 'أ' }), row({ n: 3, position: 5 })];
  it('renumbers the list 0…n−1 with the row swapped, listing only changed rows', () => {
    expect(movedOrder({ rows, id: rows[2]?.id ?? '', direction: 'up' }).map((m) => m.position)).toEqual([1, 2]);
    const ids = movedOrder({ rows, id: rows[1]?.id ?? '', direction: 'down' });
    expect(ids).toEqual([{ id: rows[0]?.id, position: 0 }, { id: rows[1]?.id, position: 1 }, { id: rows[2]?.id, position: 2 }].filter((m) => m.position !== 0));
  });

  it('does nothing at either end or for an unknown id', () => {
    expect(movedOrder({ rows, id: rows[1]?.id ?? '', direction: 'up' })).toEqual([]);
    expect(movedOrder({ rows, id: 'nope', direction: 'down' })).toEqual([]);
  });
});

describe('toSavedReply', () => {
  it('drops an unknown type', () => {
    expect(toSavedReply(row({ n: 1, attachment_path: 'saved/a/x', attachment_mime: 'image/webp', attachment_name: 'x', attachment_size: 1 })).attachment).toBeNull();
  });

  it('drops a half-written attachment', () => {
    const half = row({ n: 1, attachment_path: 'saved/a/x.pdf', attachment_mime: 'application/pdf', attachment_name: null, attachment_size: 1 });
    expect(toSavedReply(half).attachment).toBeNull();
  });

  it('a row with an owner is «mine»', () => {
    expect(toSavedReply(row({ n: 1, owner_profile_id: 'u' })).scope).toBe('mine');
  });
});
