import { describe, expect, it } from 'vitest';
import { parseCli } from './cli.args.ts';

describe('parseCli', () => {
  it('parses commands and options', () => {
    expect(parseCli(['dry-run', '--target', 'staging'])).toEqual({
      command: 'dry-run',
      target: 'staging',
      zip: undefined,
      since: undefined,
      confirmProduction: false,
      createsOnly: false,
    });
    expect(parseCli(['apply', '--target', 'staging', '--creates-only']).createsOnly).toBe(true);
    expect(
      parseCli(['apply', '--target', 'production', '--confirm-production']).confirmProduction,
    ).toBe(true);
    expect(parseCli(['extract-sheets', '--zip', 'a.zip']).zip).toBe('a.zip');
    expect(parseCli(['extract-crm', '--since', 'last']).since).toBe('last');
    expect(parseCli(['extract-crm', '--since', '2026-10-01T00:00:00Z']).since).toBe(
      '2026-10-01T00:00:00Z',
    );
  });

  it('parses --from and --only, and rejects bad values', () => {
    const a = parseCli([
      'dry-run',
      '--target',
      'staging',
      '--from',
      '2026-10-26',
      '--only',
      'students,lessons',
    ]);
    expect([a.from, a.only]).toEqual(['2026-10-26', 'students,lessons']);
    expect(() => parseCli(['dry-run', '--target', 'staging', '--from', '2026-02-30'])).toThrow(
      /--from/,
    );
    expect(() => parseCli(['dry-run', '--target', 'staging', '--from', 'today'])).toThrow(/--from/);
    expect(() => parseCli(['apply', '--target', 'staging', '--only', 'people'])).toThrow(/--only/);
  });

  it('parses --expiry-days (the setting, 1..90) and rejects anything else', () => {
    const at = (v: string) => parseCli(['dry-run', '--target', 'staging', '--expiry-days', v]);
    expect(at('14').expiryDays).toBe(14);
    expect(parseCli(['dry-run', '--target', 'staging']).expiryDays).toBeUndefined();
    for (const bad of ['0', '91', '7.5', 'week']) expect(() => at(bad)).toThrow(/--expiry-days/);
  });

  it('rejects unknown commands, missing targets, bad --since and unknown flags', () => {
    expect(() => parseCli([])).toThrow(/usage/);
    expect(() => parseCli(['drop'])).toThrow(/usage/);
    expect(() => parseCli(['apply'])).toThrow(/needs --target/);
    expect(() => parseCli(['extract-crm', '--since', 'yesterday'])).toThrow(/--since/);
    expect(() => parseCli(['review', '--force'])).toThrow();
  });
});
