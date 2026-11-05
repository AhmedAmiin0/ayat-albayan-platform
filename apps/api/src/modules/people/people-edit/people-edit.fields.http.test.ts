import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, mocks, peopleApp } from '@/modules/people/people-edit/testing/people-edit.test-app';

const S = '11111111-1111-4111-8111-111111111111';
const G = '22222222-2222-4222-8222-222222222222';

// Owner 2026-11-02: the assistant edits the admin PATCH's fields minus the admin-only ones (and
// minus notes for sales: people-edit.notes.http.test.ts).
const STUDENT_OK = {
  name: 'سهيلة',
  age: 12,
  gender: 'female',
  level: 'جزء عم',
  memorized: 'جزء',
  goal: 'حفظ',
  riwaya: 'حفص',
  tz: 'Africa/Cairo',
  teacher_gender_pref: 'female',
};
const STUDENT_ADMIN_ONLY = [
  { status: 'active' },
  { program: 'arabic' },
  { teacher_id: G },
  { meeting_link_override: 'https://meet.example/x' },
  { guardian_id: G },
  { contact_is_self: true },
  { expected_status: 'new' },
];
const GUARDIAN_OK = {
  name: 'أم سهيلة',
  phone_e164: '+201000000001',
  country: 'EG',
  tz: 'Africa/Cairo',
};

describe('/people/* bodies', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    app = await peopleApp();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.people.editStudent.mockResolvedValue({ id: S });
    mocks.people.editGuardian.mockResolvedValue({ id: G });
    mocks.families.move.mockResolvedValue({ student_id: S, guardian_id: G });
  });
  const patch = (url: string, payload: object) =>
    call(app, { method: 'PATCH', url, token: 'sales', payload });

  it('accepts every editable student field', async () => {
    expect((await patch(`/people/students/${S}`, STUDENT_OK)).statusCode).toBe(200);
    expect(mocks.people.editStudent).toHaveBeenCalledWith(
      expect.objectContaining({ patch: STUDENT_OK }),
    );
  });

  it.each(STUDENT_ADMIN_ONLY)(
    'refuses the admin-only student field %o (400, nothing written)',
    async (body) => {
      expect((await patch(`/people/students/${S}`, { name: 'سهيلة', ...body })).statusCode).toBe(
        400,
      );
      expect(mocks.people.editStudent).not.toHaveBeenCalled();
    },
  );

  it('accepts the family fields and refuses source and a non-E.164 phone', async () => {
    expect((await patch(`/people/guardians/${G}`, GUARDIAN_OK)).statusCode).toBe(200);
    expect((await patch(`/people/guardians/${G}`, { source: 'facebook_ad' })).statusCode).toBe(400);
    expect((await patch(`/people/guardians/${G}`, { phone_e164: 'abc' })).statusCode).toBe(400);
    expect(mocks.people.editGuardian).toHaveBeenCalledTimes(1);
  });

  it('a family move takes exactly one of guardian_id or a new guardian', async () => {
    const url = `/people/students/${S}/guardian`;
    const post = (payload: object) => call(app, { method: 'POST', url, token: 'sales', payload });
    const fresh = { name: 'أبو سهيلة', phone_e164: '+201000000003', tz: 'Africa/Cairo' };
    expect((await post({ guardian: fresh })).statusCode).toBe(200);
    expect(mocks.families.move).toHaveBeenCalledWith(
      expect.objectContaining({ move: { kind: 'new', guardian: fresh } }),
    );
    for (const bad of [
      {},
      { guardian_id: G, guardian: fresh },
      { guardian_id: 'x' },
      { guardian: { name: 'x', phone_e164: '0100', tz: 'Africa/Cairo' } },
    ]) {
      expect((await post(bad)).statusCode).toBe(400);
    }
    expect(mocks.families.move).toHaveBeenCalledTimes(1);
  });

  it('a bad id, a short search or a bad toggle → 400', async () => {
    expect(
      (await call(app, { method: 'GET', url: '/people/students/nope', token: 'sales' })).statusCode,
    ).toBe(400);
    expect(
      (await call(app, { method: 'GET', url: '/people/guardians?search=a', token: 'sales' }))
        .statusCode,
    ).toBe(400);
    expect(
      (await patch(`/people/students/${S}/contact-self`, { contact_is_self: 'yes' })).statusCode,
    ).toBe(400);
  });
});
