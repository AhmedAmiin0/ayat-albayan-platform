import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, mocks, peopleApp } from '@/modules/people/people-edit/testing/people-edit.test-app';

// The /people routes as declared: the shared id checks and the answers' shape.

const S = '11111111-1111-4111-8111-111111111111';
const G = '22222222-2222-4222-8222-222222222222';
const student = {
  id: S,
  code: 'AB-0183',
  name: 'سهيلة',
  age: 9,
  gender: 'female',
  level: null,
  memorized: null,
  goal: null,
  riwaya: null,
  tz: 'Asia/Riyadh',
  teacher_gender_pref: null,
  contact_is_self: false,
  phone_e164: null,
  has_login: false,
  has_records: true,
};
const guardian = {
  id: G,
  name: 'أم سهيلة',
  phone_e164: '+966501234567',
  country: 'SA',
  tz: 'Asia/Riyadh',
  has_login: false,
  phones: [{ phone_e164: '+966501234567', is_primary: true }],
  students: [{ id: S, code: 'AB-0183', name: 'سهيلة', contact_is_self: false }],
};
const option = { id: G, name: 'أم سهيلة', phone_e164: '+966501234567', students: [] };
const all = () => Object.values(mocks).flatMap((m) => Object.values(m));

describe('/people routes as declared (R-STU-02, R-STU-04)', () => {
  let app: NestFastifyApplication;
  const send = (method: 'GET' | 'PATCH' | 'POST' | 'DELETE', url: string, payload?: object) =>
    call(app, { method, url, token: 'admin', payload });

  beforeAll(async () => {
    app = await peopleApp({ checked: true });
  });
  afterAll(() => app.close());
  beforeEach(() => vi.resetAllMocks());

  it.each([
    ['GET', '/people/students/abc', undefined],
    ['PATCH', '/people/guardians/abc', { country: 'EG' }],
    ['DELETE', `/people/guardians/${G}/phones/abc`, undefined],
    ['POST', '/people/students/abc/guardian', { guardian_id: G }],
    ['PATCH', '/people/students/abc/contact-self', { contact_is_self: true }],
    ['POST', '/people/guardians/abc/to-student', undefined],
    ['POST', '/people/students/abc/to-guardian', undefined],
  ] as const)('%s %s → 400 validation_failed', async (method, url, payload) => {
    const res = await send(method, url, payload);
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    expect(all().filter((fn) => fn.mock.calls.length > 0)).toEqual([]);
  });

  it('the edit view and the family search answer as declared', async () => {
    mocks.views.view.mockResolvedValue({ student, guardian });
    mocks.families.families.mockResolvedValue([option]);
    expect((await send('GET', `/people/students/${S}`)).json()).toEqual({ student, guardian });
    const found = await send('GET', '/people/guardians?search=AB-0183');
    expect([found.statusCode, found.json()]).toEqual([200, [option]]);
  });

  it('the edits, the move and the switches answer as declared', async () => {
    mocks.people.editStudent.mockResolvedValue({ id: S, name: 'سهيلة' });
    mocks.families.move.mockResolvedValue({ student_id: S, guardian_id: G });
    mocks.roles.setSelf.mockResolvedValue({ ...student, contact_is_self: true });
    mocks.roles.guardianToStudent.mockResolvedValue({ id: S, code: 'AB-0200' });
    mocks.roles.studentToGuardian.mockResolvedValue({ guardian_id: G });
    const edited = await send('PATCH', `/people/students/${S}`, { goal: '' });
    expect([edited.statusCode, edited.json()]).toEqual([200, { id: S }]);
    const moved = await send('POST', `/people/students/${S}/guardian`, { guardian_id: G });
    expect([moved.statusCode, moved.json()]).toEqual([200, { student_id: S, guardian_id: G }]);
    const self = await send('PATCH', `/people/students/${S}/contact-self`, {
      contact_is_self: true,
    });
    expect(self.json()).toEqual({ id: S, contact_is_self: true });
    expect((await send('POST', `/people/guardians/${G}/to-student`)).statusCode).toBe(201);
    const family = await send('POST', `/people/students/${S}/to-guardian`);
    expect([family.statusCode, family.json()]).toEqual([200, { guardian_id: G }]);
  });

  it('a view that misses a field answers 500 response_contract', async () => {
    mocks.views.view.mockResolvedValue({ student: { id: S }, guardian });
    const res = await send('GET', `/people/students/${S}`);
    expect([res.statusCode, res.json().code]).toEqual([500, 'response_contract']);
  });
});
