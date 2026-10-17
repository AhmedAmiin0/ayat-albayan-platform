import { describe, expect, it } from 'vitest';
import { actionKey, entityOf, fieldNames, joinRoute, responseId, shouldLog } from './activity.route';

const ID = '0b8e2c55-0000-4000-8000-000000000001';

describe('shouldLog (activity log skip list)', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'post'])('logs a %s mutation', (method) => {
    expect(shouldLog({ method, route: '/expenses' })).toBe(true);
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])('skips %s reads', (method) => {
    expect(shouldLog({ method, route: '/expenses' })).toBe(false);
  });

  it.each(['/health', '/webhooks/whatsapp', '/webhooks/kapso', '/livekit/webhook', '/webhooks/whatsapp/status'])(
    'skips %s even when it is a POST',
    (route) => {
      expect(shouldLog({ method: 'POST', route })).toBe(false);
    },
  );

  it('does not skip a route that only shares a prefix', () => {
    expect(shouldLog({ method: 'POST', route: '/healthy' })).toBe(true);
  });
});

describe('joinRoute / actionKey', () => {
  it('joins controller and handler paths into one pattern', () => {
    expect(joinRoute('lessons/:id', 'cancel')).toBe('/lessons/:id/cancel');
    expect(joinRoute('', 'leads/:id/assign')).toBe('/leads/:id/assign');
    expect(joinRoute('/expenses/', '/')).toBe('/expenses');
  });

  it('derives a stable camelCase key from the controller class and handler', () => {
    expect(actionKey('ExpensesController', 'create')).toBe('expenses.create');
    expect(actionKey('AuthSessionController', 'login')).toBe('authSession.login');
    expect(actionKey('Controller', 'x')).toBe('app.x');
  });
});

describe('entityOf', () => {
  it('takes the segment before :id and the id param value', () => {
    expect(entityOf('/students/:id/join-link', { id: ID })).toEqual({ entity: 'students', entityId: ID });
    expect(entityOf('/teachers/:id/time-off/:timeOffId', { id: ID, timeOffId: 'x' })).toEqual({ entity: 'teachers', entityId: ID });
  });

  it('names the entity of a :fooId param', () => {
    expect(entityOf('/teacher-earnings/:teacherId/payments', { teacherId: ID })).toEqual({ entity: 'teachers', entityId: ID });
  });

  it('never stores a token, phone or key param as the entity id', () => {
    expect(entityOf('/public/join/:linkToken', { linkToken: 'secret' })).toEqual({ entity: 'join', entityId: null });
    expect(entityOf('/threads/:phone/text', { phone: '+201001234567' })).toEqual({ entity: 'threads', entityId: null });
    expect(entityOf('/public/feedback/:token', { token: 'signed' })).toEqual({ entity: 'feedback', entityId: null });
  });

  it('falls back to the first static segment, and drops over-long ids', () => {
    expect(entityOf('/expenses', {})).toEqual({ entity: 'expenses', entityId: null });
    expect(entityOf('/lessons/:id', { id: 'x'.repeat(65) })).toEqual({ entity: 'lessons', entityId: null });
    expect(entityOf('/:id', { id: ID })).toEqual({ entity: null, entityId: ID });
  });
});

describe('fieldNames / responseId', () => {
  it('keeps top-level field names only, never values or map-like keys', () => {
    const body = { amount: 9000, note: 'secret note', [ID]: 1, '+201001234567': 'x', nested: { password: 'p' } };
    expect(fieldNames(body)).toEqual(['amount', 'note', 'nested']);
    expect(fieldNames(['a'])).toEqual([]);
    expect(fieldNames(null)).toEqual([]);
  });

  it('caps the list at 30 names', () => {
    const body = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`f${i}`, i]));
    expect(fieldNames(body)).toHaveLength(30);
  });

  it('reads the created id from a response object', () => {
    expect(responseId({ id: ID, name: 'x' })).toBe(ID);
    expect(responseId([{ id: ID }])).toBeNull();
    expect(responseId(undefined)).toBeNull();
  });
});
