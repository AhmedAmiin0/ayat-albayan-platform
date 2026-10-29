import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { errorCode } from '../../../common/http/errors';
import { fakeDb, type FakeResult } from '../../people/guardians/fake-db';
import { LeadFamilyService } from './lead-family.service';

const RPC = 'rpc:link_family_phone';
const INPUT = { leadId: 'l1', code: 'AB-0183', actorId: 'u1' };

function setup(results: FakeResult[]) {
  const f = fakeDb({ [RPC]: results });
  return { ...f, svc: new LeadFamilyService(f.db) };
}

async function failure(p: Promise<unknown>): Promise<[number, string | undefined]> {
  const e: unknown = await p.then(() => null, (err: unknown) => err);
  return e instanceof HttpException ? [e.getStatus(), errorCode(e)] : [0, String(e)];
}

const pkey = { code: '23505', message: 'duplicate key value violates unique constraint "guardian_phones_pkey"' };

// The writes, their audit rows and the lead's compare-and-set live in link_family_phone (migration 973).
describe('LeadFamilyService.link «ربط بطالب موجود»', () => {
  it('one call of link_family_phone with the lead, the code and the actor; true → linked: true', async () => {
    const t = setup([{ data: true }]);
    expect(await t.svc.link(INPUT)).toEqual({ linked: true });
    expect(t.calls).toEqual([{ table: RPC, method: 'rpc', args: [{ p_lead: 'l1', p_code: 'AB-0183', p_actor: 'u1' }] }]);
  });

  it('already a number of that family → linked: false', async () => {
    expect(await setup([{ data: false }]).svc.link(INPUT)).toEqual({ linked: false });
  });

  it('the function refuses (P0001) → 404 lead_not_found / student_not_found, 409 for the rest', async () => {
    const cases = [
      ['lead_not_found', 404],
      ['student_not_found', 404],
      ['lead_has_family', 409],
      ['number_taken', 409],
      ['teacher_number', 409],
    ] as const;
    for (const [code, status] of cases) {
      const t = setup([{ error: { code: 'P0001', message: code } }]);
      expect(await failure(t.svc.link(INPUT))).toEqual([status, code]);
      expect(t.trips).toEqual([RPC]);
    }
  });

  it('the family already has a second number → 409 family_has_second_number', async () => {
    const one = { code: '23505', message: 'duplicate key value violates unique constraint "guardian_phones_one_second"' };
    expect(await failure(setup([{ error: one }]).svc.link(INPUT))).toEqual([409, 'family_has_second_number']);
  });

  it('a lost race on the number calls once more, and that answer stands', async () => {
    const same = setup([{ error: pkey }, { data: false }]);
    expect(await same.svc.link(INPUT)).toEqual({ linked: false });
    expect(same.trips).toEqual([RPC, RPC]);
    const other = setup([{ error: pkey }, { error: { code: 'P0001', message: 'lead_has_family' } }]);
    expect(await failure(other.svc.link(INPUT))).toEqual([409, 'lead_has_family']);
    const again = setup([{ error: pkey }, { error: pkey }]);
    expect(await failure(again.svc.link(INPUT))).toEqual([409, 'number_taken']);
    expect(again.trips).toEqual([RPC, RPC]);
  });

  it('any other database error is a server error, not a 4xx', async () => {
    const t = setup([{ error: { code: 'XX000', message: 'boom' } }]);
    expect((await failure(t.svc.link(INPUT)))[0]).toBe(0);
  });
});
