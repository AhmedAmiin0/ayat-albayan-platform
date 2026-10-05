import { describe, expect, it } from 'vitest';
import { decide } from './permission-check';

const set = (...p: string[]) => new Set(p);
const call = (method: string, path: string) => ({ method, path });

describe('decide', () => {
  it('the wildcard passes everything, mapped or not', () => {
    expect(decide(set('*'), undefined, call('GET', '/students'))).toEqual({ ok: true });
    expect(decide(set('*'), undefined, call('POST', '/translations/x'))).toEqual({ ok: true });
    expect(decide(set('*'), 'roles.manage', call('GET', '/anything'))).toEqual({ ok: true });
  });

  it('allows a mapped route when the permission is held', () => {
    expect(decide(set('students.view'), undefined, call('GET', '/students/1'))).toEqual({ ok: true });
    expect(decide(set('students.manage'), undefined, call('GET', '/students/1'))).toEqual({ ok: true });
  });

  it('denies a mapped route when it is not, and names the permission', () => {
    expect(decide(set('students.view'), undefined, call('PATCH', '/students/1'))).toEqual({
      ok: false,
      permission: 'students.manage',
    });
    expect(decide(set(), undefined, call('GET', '/payments'))).toEqual({ ok: false, permission: 'payments.view' });
  });

  it('denies an unmapped route to a non-wildcard role (safe default)', () => {
    expect(decide(set('students.manage', 'roles.manage'), undefined, call('GET', '/translations'))).toEqual({
      ok: false,
      permission: null,
    });
  });

  it('exempts self-service routes', () => {
    expect(decide(set(), undefined, call('PUT', '/me/push-tokens'))).toEqual({ ok: true });
    expect(decide(set(), undefined, call('POST', '/activity/session/logout'))).toEqual({ ok: true });
  });

  it('an explicit permission replaces the route map', () => {
    expect(decide(set('leads.view'), 'leads.view', call('GET', '/not-mapped'))).toEqual({ ok: true });
    expect(decide(set('students.view'), 'leads.view', call('GET', '/students'))).toEqual({
      ok: false,
      permission: 'leads.view',
    });
  });
});
