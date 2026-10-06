import { describe, expect, it } from 'vitest';
import { stepReady, stepsFor, type BookingDraft } from './draft';
import { registrationDraft, requestFor } from './draft.sales';
import { ABRAR, SLOT } from './wizard-fixture';

const LEAD = '7d3f2a10-1b2c-4d5e-8f90-123456789abc';
const FAMILY = { name: 'سهيلة', guardianName: 'أم سهيلة', guardianPhone: '+966501234567' };
const ready = (over: Partial<BookingDraft> = {}): BookingDraft => ({
  ...registrationDraft(),
  teacher: ABRAR,
  startsAt: SLOT,
  newStudent: FAMILY,
  ...over,
});

describe('registrationDraft (the assistant registers a new student)', () => {
  it('is a free trial with a blank new student and no lead behind it', () => {
    const d = registrationDraft();
    expect(d).toMatchObject({ kind: 'trial', pkg: 'trial', leadId: null, students: [], newStudent: { name: '' } });
    expect(stepsFor(d.kind)).not.toContain('invoice');
  });

  it('step 1 is ready only once the student, the guardian and a valid phone are typed', () => {
    expect(stepReady(registrationDraft(), 'students')).toBe(false);
    expect(stepReady(ready({ newStudent: { ...FAMILY, guardianPhone: '123' } }), 'students')).toBe(false);
    expect(stepReady(ready(), 'students')).toBe(true);
  });
});

describe('requestFor', () => {
  it('assistant, no lead: guardian + new student + trial, with no lead id and no invoice', () => {
    const body = requestFor('sales', ready());
    expect(body).toMatchObject({
      kind: 'trial',
      teacherId: ABRAR.id,
      newStudent: { name: 'سهيلة', status: 'trial' },
      guardian: { name: 'أم سهيلة', phone_e164: '+966501234567' },
    });
    expect(body).not.toHaveProperty('leadId');
    expect(body).not.toHaveProperty('invoice');
  });

  it('assistant, from a chat: keeps that lead', () => {
    expect(requestFor('sales', ready({ leadId: LEAD }))).toMatchObject({ leadId: LEAD, newStudent: { name: 'سهيلة' } });
  });

  it('is nothing until a teacher and a first lesson are picked', () => {
    expect(requestFor('sales', ready({ teacher: null }))).toBeNull();
    expect(requestFor('sales', ready({ startsAt: null }))).toBeNull();
  });

  it('admin: unchanged, a new student still needs its lead', () => {
    expect(requestFor('admin', ready())).toBeNull();
    expect(requestFor('admin', ready({ leadId: LEAD }))).toMatchObject({ leadId: LEAD });
  });
});
