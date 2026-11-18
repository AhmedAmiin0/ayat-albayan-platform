import { describe, expect, it, vi } from 'vitest';
import type { ShortLinkRow, ShortLinks } from '@/modules/platform/short-links';
import type {
  LinkUserRow,
  LinkUsersRepo,
} from '@/modules/platform/short-links-admin/managed/link-users.repo';
import type { LinkPeopleRepo } from '@/modules/platform/short-links-admin/people';
import { managedRow } from '@/modules/platform/short-links-admin/short-links-admin.fakes';
import { GateService } from './gate.service';

const P1 = '00000000-0000-4000-8000-0000000000c1';
const PHONE = '+201000000001';
const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const call = { code: 'Mg12Cd34Ef', phone: PHONE, ip: '203.0.113.9' };

function setup(row: ShortLinkRow | null, users: Partial<LinkUserRow>[] = []) {
  const links = { row: vi.fn(async () => row) };
  const repo = {
    users: vi.fn(async () => users),
    visits: vi.fn(async () => []),
    recordVisit: vi.fn(async () => 'recorded'),
  };
  const people = {
    phonesOf: vi.fn(async () => new Map<string, string>()),
    ownerOfPhone: vi.fn(async () => ({ profileId: null, guardianId: null })),
  };
  const codes = {
    sendable: vi.fn(async () => true),
    issue: vi.fn(async () => true),
    check: vi.fn(async () => true),
    limit: vi.fn(async () => undefined),
  };
  const gate = new GateService(
    links as unknown as ShortLinks,
    repo as unknown as LinkUsersRepo,
    people as unknown as LinkPeopleRepo,
    codes,
  );
  return { gate, repo, codes };
}

describe('the short-link gate (docs/19)', () => {
  it('the view: title and state, never the target; unknown and system codes are the same 404', async () => {
    const { gate } = setup(managedRow({ expires_at: FUTURE }));
    const view = await gate.view('Mg12Cd34Ef');
    expect(view).toEqual({
      title: 'رابط التسجيل',
      state: 'open',
      goneReason: null,
      needs: 'sign_in_or_code',
      codesAvailable: true,
    });
    expect(JSON.stringify(view)).not.toContain('https://');
    await expect(setup(null).gate.view('x')).rejects.toThrow(/short_link_not_found/);
    const system = managedRow({ kind: 'teacher_report' });
    await expect(setup(system).gate.view('x')).rejects.toThrow(/short_link_not_found/);
  });

  it('the view of a gone link says why: revoked by an admin, else expired', async () => {
    const revoked = setup(managedRow({ status: 'revoked', expires_at: FUTURE }));
    expect(await revoked.gate.view('Mg12Cd34Ef')).toMatchObject({
      state: 'gone',
      goneReason: 'revoked',
    });
    const past = setup(managedRow({ expires_at: '2020-01-01T00:00:00Z' }));
    expect(await past.gate.view('Mg12Cd34Ef')).toMatchObject({
      state: 'gone',
      goneReason: 'expired',
    });
  });

  it('a signed-in user opens: the visit is recorded by profile and the target answered', async () => {
    const { gate, repo } = setup(managedRow({ expires_at: FUTURE }));
    expect(await gate.openAs('Mg12Cd34Ef', P1)).toEqual({
      outcome: 'open',
      target: 'https://app.example.com/register',
    });
    expect(repo.recordVisit).toHaveBeenCalledWith(
      'Mg12Cd34Ef',
      expect.objectContaining({ p_profile: P1, p_phone: null }),
    );
  });

  it('an expired or revoked link is gone and records nothing', async () => {
    const { gate, repo } = setup(managedRow({ status: 'revoked', expires_at: FUTURE }));
    expect(await gate.openAs('Mg12Cd34Ef', P1)).toEqual({ outcome: 'gone' });
    expect(repo.recordVisit).not.toHaveBeenCalled();
  });

  it('a race the read missed: the database answers limit_reached', async () => {
    const { gate, repo } = setup(managedRow({ expires_at: FUTURE, max_users: 1 }));
    repo.recordVisit.mockResolvedValueOnce('limit_reached');
    expect(await gate.openAs('Mg12Cd34Ef', P1)).toEqual({ outcome: 'limit_reached' });
  });

  it('otp/start: a listed link sends a code only to a listed phone (always 202)', async () => {
    const listed = managedRow({ expires_at: FUTURE, audience: 'listed' });
    const outsider = setup(listed, [{ profile_id: P1, phone_e164: null }]);
    await outsider.gate.start(call);
    expect(outsider.codes.issue).not.toHaveBeenCalled();
    const insider = setup(listed, [{ profile_id: null, phone_e164: PHONE }]);
    await insider.gate.start(call);
    expect(insider.codes.issue).toHaveBeenCalledWith({ code: 'Mg12Cd34Ef', phone: PHONE });
    expect(insider.codes.limit).toHaveBeenCalledWith('request', {
      ip: call.ip,
      identifier: 'short-link:Mg12Cd34Ef',
    });
  });

  it('otp/verify: a wrong code is 401 invalid_code; a right one records the phone visit', async () => {
    const { gate, codes, repo } = setup(managedRow({ expires_at: FUTURE }));
    codes.check.mockResolvedValueOnce(false);
    await expect(gate.verify({ ...call, otp: '000000' })).rejects.toThrow(/invalid_code/);
    expect(await gate.verify({ ...call, otp: '123456' })).toMatchObject({ outcome: 'open' });
    expect(repo.recordVisit).toHaveBeenCalledWith(
      'Mg12Cd34Ef',
      expect.objectContaining({ p_phone: PHONE }),
    );
  });
});
