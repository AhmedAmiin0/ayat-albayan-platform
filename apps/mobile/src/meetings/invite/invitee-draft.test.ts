import { formatPhone } from '@ab/shared';
import { ltr } from '@/core/ui/primitives/Ltr';
import { addInvitee, fromOption, fromPhone, isFull, removeInvitee, type DraftInvitee } from './invitee-draft';

const staff = fromOption({ kind: 'staff', id: '7b0c5f1e-1111-4a1a-8a1a-000000000001', name: 'أبرار', role: 'teacher' });
const student = fromOption({ kind: 'student', id: '7b0c5f1e-2222-4a1a-8a1a-000000000002', name: 'يوسف', code: 'AB-0182' });

test('a search result becomes a staff or student invitee', () => {
  expect(staff.input).toEqual({ kind: 'staff', profileId: '7b0c5f1e-1111-4a1a-8a1a-000000000001' });
  expect(student).toMatchObject({ label: 'يوسف · AB-0182', input: { kind: 'student', studentId: '7b0c5f1e-2222-4a1a-8a1a-000000000002' } });
});

test('a typed phone is kept only in E.164 (shared normalizePhone)', () => {
  expect(fromPhone('+20 100 000 0101')).toEqual({ key: 'phone:+201000000101', label: ltr(formatPhone('+201000000101')), input: { kind: 'phone', phone: '+201000000101' } });
  expect(fromPhone('0100')).toBeNull();
  expect(fromPhone('abc')).toBeNull();
});

test('adding twice keeps one; removing takes it off', () => {
  const once = addInvitee([], staff);
  expect(addInvitee(once, staff)).toHaveLength(1);
  const both = addInvitee(once, student);
  expect(removeInvitee(both, staff.key)).toEqual([student]);
});

test('at most 30', () => {
  const many: DraftInvitee[] = Array.from({ length: 30 }, (_, i) => ({ ...staff, key: `k${i}` }));
  expect(isFull(many)).toBe(true);
  expect(addInvitee(many, student)).toHaveLength(30);
  expect(isFull(many.slice(1))).toBe(false);
});
