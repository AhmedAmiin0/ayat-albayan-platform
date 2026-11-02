import { describe, expect, it } from 'vitest';
import { toEntry, type ActivityRequest, type EntryInput } from './activity.entry';

const ID = '0b8e2c55-0000-4000-8000-000000000001';

function entry(req: Partial<ActivityRequest>, over: Partial<EntryInput> = {}) {
  const full: ActivityRequest = { method: 'POST', headers: {}, ...req };
  return toEntry({ req: full, route: '/expenses', action: 'expenses.create', status: 201, durationMs: 7.6, ...over });
}

describe('toEntry (one activity_log row)', () => {
  it('rounds the duration and uppercases the method', () => {
    const row = entry({ method: 'patch' }, { route: '/expenses/:id', status: 200 });
    expect(row).toMatchObject({ method: 'PATCH', duration_ms: 8, status: 200 });
  });

  it('marks the actor role: their role, public without a login, unknown without a profile', () => {
    expect(entry({ user: { id: ID, email: null, role: 'teacher' } })?.actor_role).toBe('teacher');
    expect(entry({})?.actor_role).toBe('public');
    expect(entry({ user: { id: ID, email: null, role: null } })?.actor_role).toBe('unknown');
    expect(entry({})?.actor_id).toBeNull();
  });

  it('keeps only a valid IP and a truncated user agent', () => {
    expect(entry({ ip: '::1' })?.ip).toBe('::1');
    expect(entry({ ip: 'unknown host' })?.ip).toBeNull();
    expect(entry({ headers: { 'user-agent': 'x'.repeat(300) } })?.user_agent).toHaveLength(200);
    expect(entry({ headers: { 'user-agent': ['a', 'b'] } })?.user_agent).toBeNull();
  });

  it('records no field names for a DELETE and no created id on a failed POST', () => {
    expect(entry({ method: 'DELETE', body: { reason: 'x' } }, { status: 204 })?.meta).toEqual({});
    expect(entry({}, { status: 409, response: { id: ID } })?.entity_id).toBeNull();
    expect(entry({}, { response: { id: ID } })?.entity_id).toBe(ID);
  });

  it('drops a throttled call that carries no login', () => {
    expect(entry({}, { status: 429 })).toBeNull();
    expect(entry({ user: { id: ID, email: null, role: 'admin' } }, { status: 429 })).not.toBeNull();
  });
});
