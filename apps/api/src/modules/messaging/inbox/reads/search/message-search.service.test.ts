import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import type { OwnNumbers } from '@/modules/messaging/numbers';
import type { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import type { MessageSearchRepo } from './message-search.repo';
import { MessageSearchService } from './message-search.service';

const OWN = '+966500000009';
const FAMILY = '+966500000001';
const user = (role: AuthUser['role']): AuthUser => ({ id: 'u1', email: null, role });
const AT = '2026-10-01T09:30:00.123456+00:00';
const ID = 'b1111111-1111-4111-8111-111111111111';

function setup() {
  const reads = { salesScope: vi.fn(async () => null), scope: vi.fn(async () => null) };
  const repo = { search: vi.fn(async () => []) };
  const own = { phones: vi.fn(async () => new Set([OWN])) };
  const service = new MessageSearchService(
    reads as unknown as ThreadReads,
    repo as unknown as MessageSearchRepo,
    own as unknown as OwnNumbers,
  );
  return { reads, repo, service };
}

describe('MessageSearchService scopes (same as reading each chat)', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it('the admin searches every chat but the academy own numbers', async () => {
    await t.service.search({ q: 'درس', cursor: `${AT}_${ID}` }, user('admin'));
    expect(t.repo.search).toHaveBeenCalledWith({
      q: 'درس', phones: null, hide: [OWN], skipTemplates: [], before: { at: AT, id: ID }, limit: 30,
    });
  });

  it('sales searches every chat without the two link templates', async () => {
    t.reads.salesScope.mockResolvedValueOnce({} as never);
    await t.service.search({ q: 'درس' }, user('sales'));
    expect(t.repo.search).toHaveBeenCalledWith(expect.objectContaining({
      phones: null, hide: [OWN], before: null,
      skipTemplates: ['lesson_feedback_request', 'lesson_join_link'],
    }));
    expect(t.reads.scope).not.toHaveBeenCalled();
  });

  it('a teacher searches only her scope; an empty scope reads nothing', async () => {
    const scope = { teacherId: 't', teacherName: 'x', phones: new Set([FAMILY]), ownPhone: null };
    t.reads.scope.mockResolvedValueOnce(scope as never);
    await t.service.search({ q: 'درس' }, user('teacher'));
    const mine = expect.objectContaining({ phones: [FAMILY], skipTemplates: [] });
    expect(t.repo.search).toHaveBeenCalledWith(mine);
    t.repo.search.mockClear();
    t.reads.scope.mockResolvedValueOnce({ ...scope, phones: new Set() } as never);
    expect(await t.service.search({ q: 'درس' }, user('teacher'))).toEqual({ items: [], next_cursor: null });
    expect(t.repo.search).not.toHaveBeenCalled();
  });

  it('an assistant gets 403 and an unlinked teacher 404, with no search', async () => {
    t.reads.scope.mockRejectedValueOnce(new ForbiddenException());
    await expect(t.service.search({ q: 'درس' }, user('assistant'))).rejects.toBeInstanceOf(ForbiddenException);
    t.reads.scope.mockRejectedValueOnce(new NotFoundException({ code: 'teacher_not_linked' }));
    await expect(t.service.search({ q: 'درس' }, user('teacher'))).rejects.toBeInstanceOf(NotFoundException);
    expect(t.repo.search).not.toHaveBeenCalled();
  });
});
