import type { LinkCandidate } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { initialCreateForm, type CreateForm } from './create-form';
import { createBody, createErrors, emailError, nameError, passwordError, phoneError } from './validation';

const STUDENT: LinkCandidate = { kind: 'student', id: '0b0c53a6-6f0e-4f56-9d5d-0d6a3a0e6a11', name: 'يوسف', code: 'AB-0007' };
const form = (patch: Partial<CreateForm> = {}): CreateForm => ({ ...initialCreateForm(), email: 'a@b.co', full_name: 'سارة أحمد', ...patch });

describe('field checks', () => {
  it('email shape', () => {
    expect(emailError('a@b.co')).toBeUndefined();
    expect(emailError('nope')).toBe(t.users.validation.email);
    expect(emailError('a@b')).toBe(t.users.validation.email);
  });
  it('name length', () => {
    expect(nameError('سا')).toBeUndefined();
    expect(nameError(' س ')).toBe(t.users.validation.name);
  });
  it('phone is optional and normalised by the shared rule', () => {
    expect(phoneError('')).toBeUndefined();
    expect(phoneError('0551234567')).toBeUndefined();
    expect(phoneError('12')).toBeTruthy();
    expect(phoneError('abc')).toBe(t.common.phoneErrors.not_a_number);
  });
  it('password uses the shared minimum', () => {
    expect(passwordError('')).toBe(t.users.validation.passwordBlank);
    expect(passwordError('short')).toContain('8');
    expect(passwordError('long-enough-1')).toBeUndefined();
    expect(passwordError('abcdef', 6)).toBeUndefined();
    expect(passwordError('x'.repeat(80))).toBe(t.users.validation.passwordLong);
  });
});

describe('createErrors', () => {
  it('a staff user needs only email and name', () => {
    expect(createErrors(form())).toEqual({});
    expect(Object.keys(createErrors(form({ email: '', full_name: '' }))).sort()).toEqual(['email', 'full_name']);
  });
  it('student and guardian require a link', () => {
    expect(createErrors(form({ role: 'student' })).linked).toBe(t.users.validation.linkRequired);
    expect(createErrors(form({ role: 'guardian' })).linked).toBe(t.users.validation.linkRequired);
    expect(createErrors(form({ role: 'student', linked: STUDENT }))).toEqual({});
  });
  it('a teacher needs a link or a new teacher name', () => {
    expect(createErrors(form({ role: 'teacher' })).linked).toBeTruthy();
    const fresh = form({ role: 'teacher', teacherMode: 'new' });
    expect(createErrors(fresh).teacher_name).toBeTruthy();
    fresh.newTeacher.display_name_ar = 'أبرار';
    expect(createErrors(fresh)).toEqual({});
  });
  it('checks the typed password only in set mode', () => {
    expect(createErrors(form({ credential: 'generate', password: '' })).password).toBeUndefined();
    expect(createErrors(form({ credential: 'set', password: '' })).password).toBeTruthy();
  });
});

describe('createBody', () => {
  it('lowercases the email, normalises the phone, omits blanks', () => {
    const body = createBody(form({ email: ' Sara@Ab.CO ', phone: '0551234567' }));
    expect(body).toEqual({ email: 'sara@ab.co', full_name: 'سارة أحمد', role: 'assistant', credential: 'generate', phone_e164: '+966551234567' });
  });
  it('links an existing student and passes the typed password', () => {
    const body = createBody(form({ role: 'student', linked: STUDENT, credential: 'set', password: 'long-enough-1' }));
    expect(body).toMatchObject({ role: 'student', linked_id: STUDENT.id, credential: 'set', password: 'long-enough-1' });
    expect(body).not.toHaveProperty('new_teacher');
  });
  it('a new teacher sends new_teacher and no linked_id', () => {
    const f = form({ role: 'teacher', teacherMode: 'new', linked: STUDENT, role_id: 'r-1' });
    f.newTeacher = { display_name_ar: 'أبرار', display_name_en: '', gender: 'female' };
    const body = createBody(f);
    expect(body).toMatchObject({ role_id: 'r-1', new_teacher: { display_name_ar: 'أبرار', gender: 'female' } });
    expect(body).not.toHaveProperty('linked_id');
    expect(body.new_teacher).not.toHaveProperty('display_name_en');
  });
  it('never sends a link for a staff role', () => {
    expect(createBody(form({ role: 'sales', linked: STUDENT }))).not.toHaveProperty('linked_id');
  });
});
