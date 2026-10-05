import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuditModule } from '../../common/audit/audit.service';
import { TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import { AuthModule } from '../../common/auth/auth.module';
import { DB, DbModule } from '../../common/db/db.module';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import { StudentsModule } from './students.module';

const results: Record<string, FakeResult[]> = {};
const fake = fakeDb(results);
const verify: TokenVerifier = async (token) => ({ id: 'u1', email: null, role: token === 'admin' ? 'admin' : 'teacher' });
const G = { id: 'g1', name: 'ام جود', phone_e164: '+966501234567' };
const BODY = {
  name: 'سهيله',
  tz: 'Asia/Riyadh',
  guardian: { name: 'ام جود', phone_e164: '0501234567', tz: 'Asia/Riyadh', notes: '' },
};

describe('StudentsController (R-STU-02, R-STU-03)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [DbModule, AuditModule, AuthModule, StudentsModule] })
      .overrideProvider(DB)
      .useValue(fake.db)
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(verify)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    for (const k of Object.keys(results)) results[k] = [];
  });

  const send = (opts: { method: 'GET' | 'POST'; url: string; payload?: object; token?: string }) =>
    app.inject({ ...opts, headers: { authorization: `Bearer ${opts.token ?? 'admin'}` } });

  it('teachers get 403', async () => {
    expect((await send({ method: 'GET', url: '/students', token: 'teacher' })).statusCode).toBe(403);
  });

  it('list: forwards the filters; junk filters → 400 (R-STU-01)', async () => {
    results['v_student_list'] = [{ data: [], count: 0 }];
    const ok = await send({ method: 'GET', url: '/students?status=trial,active&teacher=none&package=unpaid&weekly=yes' });
    expect(ok.statusCode).toBe(200);
    expect(fake.argsOf('v_student_list', 'in')).toEqual(['status', ['trial', 'active']]);
    expect(fake.argsOf('v_student_list', 'is')).toEqual(['teacher_id', null]);
    const bad = await send({ method: 'GET', url: '/students?package=free' });
    expect(bad.statusCode).toBe(400);
  });

  it('status-counts returns a count per status', async () => {
    results['v_student_list'] = [{ count: 1 }, { count: 2 }, { count: 0 }, { count: 0 }];
    const res = await send({ method: 'GET', url: '/students/status-counts?teacher=none' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ trial: 1, active: 2, paused: 0, churned: 0 });
  });

  it('rejects a handle instead of a phone with 400 (R-STU-02)', async () => {
    const res = await send({ method: 'POST', url: '/students', payload: { ...BODY, guardian: { ...BODY.guardian, phone_e164: '@ahmed' } } });
    expect(res.statusCode).toBe(400);
    expect(res.json().issues).toEqual([{ path: 'guardian.phone_e164', message: 'not_a_number' }]);
  });

  it('same phone in another format + similar name → 409 with candidates', async () => {
    const SUHAILA = { id: 's1', code: 'AB-0183', name: 'سهيلة', status: 'trial' };
    results['guardians'] = [{ data: G }, { data: { ...G, students: [SUHAILA] } }];
    const res = await send({ method: 'POST', url: '/students', payload: BODY });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ message: 'duplicate_student', candidates: [SUHAILA] });
    expect(fake.argsOf('guardians', 'eq')).toEqual(['phone_e164', '+966501234567']);
  });

  it('force: true creates (201)', async () => {
    results['guardians'] = [{ data: G }];
    results['students'] = [{ data: { id: 's2', name: 'سهيله' } }];
    const res = await send({ method: 'POST', url: '/students', payload: { ...BODY, force: true } });
    expect(res.statusCode).toBe(201);
  });

  it('merge validates the ids and returns the merge id', async () => {
    const bad = await send({ method: 'POST', url: '/students/not-a-uuid/merge', payload: {} });
    expect(bad.statusCode).toBe(400);
    results['rpc:merge_students'] = [{ data: 'm1' }];
    const kept = '11111111-1111-4111-8111-111111111111';
    const merged = '22222222-2222-4222-8222-222222222222';
    const res = await send({ method: 'POST', url: `/students/${kept}/merge`, payload: { merged_id: merged } });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ merge_id: 'm1' });
  });
});
