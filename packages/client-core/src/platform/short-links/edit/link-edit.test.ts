import { describe, expect, it } from 'vitest';
import { detail } from '../short-links.test-util';
import { editOf, toUpdateBody } from './link-edit';

const clock = { now: new Date('2026-11-17T11:06:00.000Z'), tz: 'Asia/Riyadh' };
const ID = '11111111-1111-4111-8111-111111111111';

describe('editOf', () => {
  it('takes the title, the limit and the listed people and typed numbers', () => {
    expect(editOf(detail)).toEqual({
      title: 'لقاء أولياء الأمور',
      maxUsers: '12',
      people: [{ id: ID, name: 'أحمد علي', role: 'guardian' }],
      phones: ['+201120000003'],
    });
  });

  it('an unlimited link has an empty limit', () => {
    expect(editOf({ ...detail, maxUsers: null, userList: [] })).toMatchObject({
      maxUsers: '',
      people: [],
      phones: [],
    });
  });
});

describe('toUpdateBody', () => {
  it('sends only the fields given', () => {
    expect(toUpdateBody({ title: ' لقاء ' }, clock)).toEqual({ body: { title: 'لقاء' } });
  });

  it('a whole edit: limit, users and no expiry change', () => {
    const edit = { ...editOf(detail), maxUsers: '' };
    expect(toUpdateBody(edit, clock)).toEqual({
      body: {
        title: 'لقاء أولياء الأمور',
        maxUsers: null,
        profileIds: [ID],
        phones: ['+201120000003'],
      },
    });
  });

  it('an extension: the new expiry instant', () => {
    expect(toUpdateBody({ expiry: { kind: 'days', days: 3 } }, clock)).toEqual({
      body: { expiresAt: '2026-11-20T11:06:00.000Z' },
    });
  });

  it('a past date and a bad limit are field errors', () => {
    const at = '2026-11-01T00:00:00.000Z';
    expect(toUpdateBody({ expiry: { kind: 'date', at }, maxUsers: '0' }, clock)).toEqual({
      errors: { expiresAt: 'expiry_past', maxUsers: 'max_users_invalid' },
    });
  });

  it('an empty title is refused', () => {
    expect(toUpdateBody({ title: '  ' }, clock)).toEqual({ errors: { title: 'title_invalid' } });
  });
});
