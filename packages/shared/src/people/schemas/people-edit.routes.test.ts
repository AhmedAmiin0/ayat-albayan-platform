import { describe, expect, it } from 'vitest';
import { peopleEditRoutes } from './people-edit.routes';

const ID = '11111111-1111-4111-8111-111111111111';
const family = {
  id: ID,
  name: 'أم سهيلة',
  phone_e164: '+966501234567',
  country: 'SA',
  tz: 'Asia/Riyadh',
  has_login: false,
  phones: [{ phone_e164: '+966501234567', is_primary: true }],
  students: [{ id: ID, code: 'AB-0183', name: 'سهيلة', contact_is_self: false }],
};

describe('peopleEditRoutes (R-STU-02, R-STU-04)', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(peopleEditRoutes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /people/students/:id',
      'PATCH /people/students/:id',
      'PATCH /people/guardians/:id',
      'DELETE /people/guardians/:id/phones/:phone',
      'GET /people/guardians',
      'POST /people/students/:id/guardian',
      'PATCH /people/students/:id/contact-self',
      'POST /people/guardians/:id/to-student',
      'POST /people/students/:id/to-guardian',
    ]);
  });

  it('reads blank form fields as null and refuses an admin-only field', () => {
    const { editStudent, editGuardian } = peopleEditRoutes;
    expect(editStudent.body.parse({ goal: '', phone_e164: '' })).toEqual({
      goal: null,
      phone_e164: null,
    });
    expect(editStudent.body.safeParse({ status: 'active' }).success).toBe(false);
    expect(editGuardian.body.safeParse({ source: 'ads' }).success).toBe(false);
  });

  it('tags a move to an existing family or a new one', () => {
    const { body } = peopleEditRoutes.move;
    expect(body.parse({ guardian_id: ID })).toEqual({ kind: 'existing', id: ID });
    expect(body.safeParse({ guardian_id: ID, guardian: {} }).success).toBe(false);
  });

  it('answers the move with the student and the family it is in now', () => {
    const reply = { student_id: ID, guardian_id: ID };
    expect(peopleEditRoutes.move.response.parse(reply)).toEqual(reply);
    expect(peopleEditRoutes.toGuardian.response.parse({ guardian_id: ID })).toEqual({
      guardian_id: ID,
    });
    const self = { id: ID, contact_is_self: true };
    expect(peopleEditRoutes.contactSelf.response.parse(self)).toEqual(self);
  });

  it('refuses a family whose child has no contact flag', () => {
    const bad = { ...family, students: [{ id: ID, code: null, name: 'سهيلة' }] };
    const view = { student: {}, guardian: bad };
    expect(peopleEditRoutes.view.response.safeParse(view).success).toBe(false);
  });

  it.each([
    ['a bad id', { id: 'x', phone: '+966552220000' }],
    ['a bad phone', { id: ID, phone: '@handle' }],
  ])('refuses %s in the path', (_name, params) => {
    expect(peopleEditRoutes.removePhone.params.safeParse(params).success).toBe(false);
  });

  it('searches families from two characters, trimmed', () => {
    const { query } = peopleEditRoutes.families;
    expect(query.parse({ search: ' AB-0183 ' })).toEqual({ search: 'AB-0183' });
    expect(query.safeParse({ search: 'a' }).success).toBe(false);
  });
});
