import { describe, expect, it, vi } from 'vitest';
import type { SignInSettings } from '@/modules/people/sign-in/sign-in.settings';
import type { CodeIssuer } from './code-issuer';
import type { SignInLimits } from './code-limits';
import { ReportCodesAdapter } from './report-codes.adapter';

const REPORT = '00000000-0000-4000-8000-0000000000f1';
const NOW = new Date('2026-11-06T12:00:00Z');

function setup() {
  const codes = {
    issue: vi.fn(async () => true),
    check: vi.fn(async () => true),
    sendable: vi.fn(),
  };
  const limits = { assert: vi.fn(async () => undefined) };
  const settings = { config: { pepper: 'test-pepper' } };
  const adapter = new ReportCodesAdapter(
    codes as unknown as CodeIssuer,
    limits as unknown as SignInLimits,
    settings as unknown as SignInSettings,
  );
  return { adapter, codes, limits };
}

describe('ReportCodesAdapter — the report page on the sign-in codes', () => {
  it('issues and checks purpose report_view for THIS report only (a code never opens another)', async () => {
    const { adapter, codes } = setup();
    await adapter.issue({ reportId: REPORT, phone: '+15550000001' });
    expect(codes.issue).toHaveBeenCalledWith({
      purpose: 'report_view',
      subject: { kind: 'report', id: REPORT },
      phone: '+15550000001',
    });
    await adapter.check({ reportId: REPORT, code: '123456' }, NOW);
    expect(codes.check).toHaveBeenCalledWith(
      { subject: { kind: 'report', id: REPORT }, purposes: ['report_view'], code: '123456' },
      NOW,
    );
  });

  it('the same per-IP / per-identifier buckets and pepper as the sign-in', async () => {
    const { adapter, limits } = setup();
    await adapter.limit('check', { ip: '203.0.113.9', identifier: 'report:x' });
    expect(limits.assert).toHaveBeenCalledWith('check', {
      ip: '203.0.113.9',
      identifier: 'report:x',
    });
    expect(adapter.pepper()).toBe('test-pepper');
  });
});
