import { describe, expect, it } from 'vitest';
import {
  emptyLinkForm, expiresAtOf, listedCount, maxUsersOf, SHORT_LINK_DEFAULT_DAYS, toCreateBody,
  withoutPerson, withoutPhone, withPerson, withPhone, type LinkForm,
} from './link-form';

const clock = { now: new Date('2026-11-17T11:06:00.000Z'), tz: 'Asia/Riyadh' };
const ID = '11111111-1111-4111-8111-111111111111';
const form = (patch: Partial<LinkForm> = {}): LinkForm => ({
  ...emptyLinkForm(SHORT_LINK_DEFAULT_DAYS),
  title: ' لقاء الأسر ',
  targetUrl: ' https://meet.google.com/kdw-pqhr-xab ',
  ...patch,
});

describe('emptyLinkForm', () => {
  it('starts open to anyone, unlimited, for the default days', () => {
    expect(SHORT_LINK_DEFAULT_DAYS).toBe(7);
    expect(emptyLinkForm(3)).toMatchObject({
      audience: 'anyone', maxUsers: '', expiry: { kind: 'days', days: 3 }, sendWhatsapp: false,
    });
  });
});

describe('expiresAtOf', () => {
  it('adds days to now or takes the picked instant', () => {
    expect(expiresAtOf({ kind: 'days', days: 7 }, clock)).toBe('2026-11-24T11:06:00.000Z');
    const at = '2026-12-01T06:00:00.000Z';
    expect(expiresAtOf({ kind: 'date', at }, clock)).toBe(at);
    expect(expiresAtOf({ kind: 'date', at: 'nope' }, clock)).toBe('');
  });
});

describe('maxUsersOf', () => {
  it('reads empty as unlimited and Arabic digits as numbers', () => {
    expect(maxUsersOf(' ')).toBeNull();
    expect(maxUsersOf('١٢')).toBe(12);
    expect(maxUsersOf('x')).toBeNaN();
  });
});

describe('toCreateBody', () => {
  it('builds the trimmed body', () => {
    const people = [{ id: ID, name: 'أحمد', role: 'guardian' }];
    const out = toCreateBody(form({ audience: 'listed', people, maxUsers: '5' }), clock);
    expect(out).toEqual({
      body: {
        title: 'لقاء الأسر', targetUrl: 'https://meet.google.com/kdw-pqhr-xab',
        expiresAt: '2026-11-24T11:06:00.000Z', maxUsers: 5, audience: 'listed',
        profileIds: [ID], phones: [], sendWhatsapp: false,
      },
    });
  });

  it('flags each field with its key', () => {
    const out = toCreateBody(
      form({ title: ' ', targetUrl: 'http://x.test', maxUsers: '0', phones: ['123'] }),
      clock,
    );
    expect(out).toEqual({
      errors: {
        title: 'title_invalid', targetUrl: 'target_invalid', maxUsers: 'max_users_invalid',
        phones: 'phone_invalid',
      },
    });
  });

  it('needs people for a listed or sent link', () => {
    expect(toCreateBody(form({ sendWhatsapp: true }), clock)).toEqual({
      errors: { people: 'users_required' },
    });
  });

  it('refuses an expiry in the past, and one that does not parse', () => {
    const past = form({ expiry: { kind: 'date', at: '2026-11-01T00:00:00Z' } });
    expect(toCreateBody(past, clock)).toEqual({ errors: { expiresAt: 'expiry_past' } });
    const bad = form({ expiry: { kind: 'date', at: 'x' } });
    expect(toCreateBody(bad, clock)).toEqual({ errors: { expiresAt: 'expiry_invalid' } });
  });
});

describe('the lists', () => {
  const pick = { id: ID, name: 'أحمد', role: 'guardian' };
  it('adds people and phones once and removes them', () => {
    expect(withPerson(withPerson([], pick), pick)).toEqual([pick]);
    expect(withoutPerson([pick], ID)).toEqual([]);
    expect(withPhone(withPhone([], '+966500000001'), '+966500000001')).toEqual(['+966500000001']);
    expect(withoutPhone(['+966500000001'], '+966500000001')).toEqual([]);
    expect(listedCount(form({ people: [pick], phones: ['+966500000001'] }))).toBe(2);
  });
});
