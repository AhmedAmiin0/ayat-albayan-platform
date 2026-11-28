import { describe, expect, it, vi } from 'vitest';
import { asResponse } from '@/common/http/returns';
import { ADMIN_ACTOR, row, setupUsers } from '@/modules/people/users/users.fakes';

vi.mock('@/common/http/returns', { spy: true });

const people = () => [row('admin1', 'admin'), row('admin2', 'admin'), row('t1', 'teacher'), row('sales1', 'sales')];

describe('user write answers (docs/62 part 2 §3: asResponse on read routes only)', () => {
  it('answers a disable, a password reset and an edit without the read check, which GET /users/:id keeps', async () => {
    const { lifecycle, updater, users } = setupUsers(people());
    vi.mocked(asResponse).mockClear();
    await lifecycle.disable('t1', {}, ADMIN_ACTOR);
    await lifecycle.resetPassword('t1', { credential: 'generate' }, ADMIN_ACTOR);
    await updater.update('sales1', { full_name: 'خالد' }, ADMIN_ACTOR);
    expect(asResponse).not.toHaveBeenCalled();
    await users.get('t1');
    expect(asResponse).toHaveBeenCalledTimes(1);
  });
});
