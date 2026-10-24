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

  it('rejects unknown commands, missing targets, bad --since and unknown flags', () => {
    expect(() => parseCli([])).toThrow(/usage/);
    expect(() => parseCli(['drop'])).toThrow(/usage/);
    expect(() => parseCli(['apply'])).toThrow(/needs --target/);
    expect(() => parseCli(['extract-crm', '--since', 'yesterday'])).toThrow(/--since/);
    expect(() => parseCli(['review', '--force'])).toThrow();
  });
});
