import type { FamilyOption } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  attachModel,
  emptyFamily,
  familyFormOf,
  freshPhoneOf,
  hasNotes,
  studentFormOf,
  studentTextKeys,
  type MoveChoice,
} from '../../index.js';
import { VIEW } from './people-edit.fixtures.js';

const TEXT = { moveConfirm: 'نقل {student} إلى {family}؟', invalid: 'تحقق' };
const PHONE = '+201000000003';
const FRESH: MoveChoice = {
  body: { guardian: { name: 'اسم مكتوب', phone_e164: PHONE, tz: 'Africa/Cairo' } },
  name: 'اسم مكتوب',
  id: null,
};
const OTHER: FamilyOption = { id: 'g-b', name: 'أبو خالد', phone_e164: PHONE, students: [] };

function model(choice: MoveChoice, matches: readonly FamilyOption[] | undefined) {
  const set = { search: vi.fn(), choice: vi.fn(), fresh: vi.fn(), invalid: vi.fn() };
  const state = { search: '', choice, fresh: emptyFamily('Africa/Cairo'), invalid: [] };
  const move = { mutate: vi.fn(), isPending: false, errorText: null };
  return attachModel({ view: VIEW, state, set, families: [], matches, move, text: TEXT });
}

// Merge gate #2: a «new» number that already exists moves the student to THAT family.
describe('attachModel: the confirm names the family the API resolves', () => {
  it('a «new» number of an existing family → that family’s real name', () => {
    expect(freshPhoneOf(FRESH)).toBe(PHONE);
    expect(model(FRESH, [OTHER]).confirmText).toBe('نقل سهيلة إلى أبو خالد؟');
  });

  it('a number nobody has → the typed name; a match on another number is ignored', () => {
    expect(model(FRESH, []).confirmText).toBe('نقل سهيلة إلى اسم مكتوب؟');
    const second = { ...OTHER, phone_e164: '+201000000099' };
    expect(model(FRESH, [second]).confirmText).toBe('نقل سهيلة إلى اسم مكتوب؟');
  });

  it('not ready while the number’s lookup is pending; a picked family needs none', () => {
    expect(model(FRESH, undefined).ready).toBe(false);
    expect(model(FRESH, []).ready).toBe(true);
    const picked = { body: { guardian_id: 'g2' }, name: 'أبو خالد', id: 'g2' };
    expect(freshPhoneOf(picked)).toBe('');
    expect(model(picked, undefined).ready).toBe(true);
  });
});

// Merge gate #3: the sales role's view has no notes; the forms leave them out.
describe('notes and the sales view', () => {
  const { notes, ...student } = VIEW.student;
  const { notes: familyNotes, ...guardian } = VIEW.guardian;
  const sales = { student, guardian };

  it('hasNotes / studentTextKeys follow the view', () => {
    expect(hasNotes(VIEW)).toBe(true);
    expect(studentTextKeys(VIEW)).toContain('notes');
    expect(hasNotes(sales)).toBe(false);
    expect(studentTextKeys(sales)).not.toContain('notes');
  });

  it('the forms read a missing note as empty, so it never counts as a change', () => {
    expect(studentFormOf(sales.student).notes).toBe('');
    expect(familyFormOf(sales.guardian).notes).toBe('');
  });
});
