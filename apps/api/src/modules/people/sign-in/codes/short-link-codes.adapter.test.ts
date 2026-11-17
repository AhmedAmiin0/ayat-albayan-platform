import { describe, expect, it, vi } from 'vitest';
import type { CodeIssuer } from './code-issuer';
import type { SignInLimits } from './code-limits';
import { ShortLinkCodesAdapter, visitorSubjectId } from './short-link-codes.adapter';

const NOW = new Date('2026-11-17T12:00:00Z');
const V = { code: 'Mg12Cd34Ef', phone: '+201000000001' };

function setup() {
  const codes = {
    issue: vi.fn(async () => true),
    check: vi.fn(async () => true),
    sendable: vi.fn(),
  };
  const limits = { assert: vi.fn(async () => undefined) };
  const adapter = new ShortLinkCodesAdapter(
    codes as unknown as CodeIssuer,
    limits as unknown as SignInLimits,
  );
  return { adapter, codes, limits };
}

describe('ShortLinkCodesAdapter: the gate on the sign-in codes', () => {
  it('purpose short_link, subject = (link, phone): a code never opens another link or phone', async () => {
    const { adapter, codes } = setup();
    const subject = { kind: 'short_link', id: visitorSubjectId(V) };
    await adapter.issue(V);
    expect(codes.issue).toHaveBeenCalledWith({ purpose: 'short_link', subject, phone: V.phone });
    await adapter.check({ ...V, otp: '123456' }, NOW);
    expect(codes.check).toHaveBeenCalledWith(
      { subject, purposes: ['short_link'], phone: V.phone, code: '123456' },
      NOW,
    );
    expect(visitorSubjectId({ ...V, phone: '+201000000002' })).not.toBe(subject.id);
    expect(visitorSubjectId({ ...V, code: 'Other1234x' })).not.toBe(subject.id);
  });

  it('the subject id is a stable uuid-shaped digest (login_codes.subject_id is a uuid)', () => {
    expect(visitorSubjectId(V)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(visitorSubjectId(V)).toBe(visitorSubjectId({ ...V }));
  });

  it('the same per-IP / per-identifier buckets as the sign-in', async () => {
    const { adapter, limits } = setup();
    await adapter.limit('request', { ip: '203.0.113.9', identifier: 'short-link:x' });
    expect(limits.assert).toHaveBeenCalledWith('request', {
      ip: '203.0.113.9',
      identifier: 'short-link:x',
    });
  });
});
