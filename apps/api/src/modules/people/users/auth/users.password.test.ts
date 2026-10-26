import { passwordProblem } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { generatePassword } from './users.password';
import { redact } from '../users.redact';

describe('generatePassword', () => {
  it('is at least 16 characters and at least the configured minimum', () => {
    expect(generatePassword(8)).toHaveLength(16);
    expect(generatePassword(30)).toHaveLength(30);
  });
  it('always passes the shared password rule and has a letter and a digit', () => {
    for (let i = 0; i < 50; i += 1) {
      const p = generatePassword(8);
      expect(passwordProblem(p, 8)).toBeNull();
      expect(p).toMatch(/\d/);
      expect(p).toMatch(/[a-zA-Z]/);
    }
  });
  it('avoids look-alike characters and repeats differently each time', () => {
    const seen = new Set(Array.from({ length: 20 }, () => generatePassword(8)));
    expect(seen.size).toBe(20);
    for (const p of seen) expect(p).not.toMatch(/[0OlI1]/);
  });
  it('repairs a draw without a digit or without a letter', () => {
    expect(generatePassword(8, () => 0)).toMatch(/\d/);
    expect(generatePassword(8, () => 50)).toMatch(/[a-zA-Z]/);
  });
});

describe('redact', () => {
  it('drops password-like keys at any depth and keeps the rest (credential_mode is an audit key, not a secret)', () => {
    const out = redact({ full_name: 'علي', password: 'x', nested: { new_password: 'y', ok: 1 }, list: [{ token: 't', role: 'admin' }], action_link: 'l', credential_mode: 'set' });
    expect(out).toEqual({ full_name: 'علي', nested: { ok: 1 }, list: [{ role: 'admin' }], credential_mode: 'set' });
  });
  it('passes scalars and null through', () => {
    expect(redact(null)).toBeNull();
    expect(redact('a')).toBe('a');
  });
});
