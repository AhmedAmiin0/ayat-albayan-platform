import { describe, expect, it } from 'vitest';
import { systemResolver } from '../../auth/permissions';
import { fakePolicy } from '../../../modules/notification-rules/policy/policy.fakes';
import { PushAudience } from './push.audience';
import { fakePushDb } from '../push.fakes';

const profiles = [
  { id: 's1', role: 'sales', push_tokens: [] },
  { id: 's2', role: 'sales', push_tokens: [], disabled_at: '2026-10-05T09:00:00Z' },
  { id: 's3', role: 'sales', push_tokens: ['ExponentPushToken[s]'] },
  { id: 'a1', role: 'admin', push_tokens: [] },
  { id: 't1', role: 'teacher', push_tokens: [] },
];

describe('PushAudience.salesIds / adminIds (docs/21 §6)', () => {
  it('salesIds: every enabled salesperson, no disabled one, no admin or teacher', async () => {
    const { db } = fakePushDb(profiles);
    expect(await new PushAudience(db, systemResolver, fakePolicy()).salesIds()).toEqual(['s1', 's3']);
  });

  it('adminIds is unchanged: enabled admins only', async () => {
    const { db } = fakePushDb(profiles);
    expect(await new PushAudience(db, systemResolver, fakePolicy()).adminIds()).toEqual(['a1']);
  });
});
