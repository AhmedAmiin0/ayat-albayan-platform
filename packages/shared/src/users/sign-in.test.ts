import { describe, expect, it } from 'vitest';
import { codeVerifySchema, identifierKey, isFamilyEmail, parseIdentifier, resetSchema, username } from './sign-in.js';

describe('parseIdentifier (docs/30 §6)', () => {
  it('reads an email, lower-cased', () => {
    expect(parseIdentifier('  Teacher@Example.com ')).toEqual({ kind: 'email', value: 'teacher@example.com' });
  });

  it('reads a student code in any case, with or without the dash or spaces', () => {
    for (const raw of ['AB-1234', 'ab-1234', 'ab1234', ' Ab 1234 ']) expect(parseIdentifier(raw)).toEqual({ kind: 'student', value: 'AB-1234' });
    expect(parseIdentifier('ab-183')).toEqual({ kind: 'student', value: 'AB-0183' });
  });

  it('reads a phone in any format as E.164 (a lookup key only)', () => {
    expect(parseIdentifier('+966 50 000 0001')).toEqual({ kind: 'phone', value: '+966500000001' });
    expect(parseIdentifier('00966500000001')).toEqual({ kind: 'phone', value: '+966500000001' });
    expect(parseIdentifier('+٩٦٦٥٠٠٠٠٠٠٠١')).toEqual({ kind: 'phone', value: '+966500000001' });
    expect(parseIdentifier('(+966) 500000001')).toEqual({ kind: 'phone', value: '+966500000001' });
    expect(parseIdentifier('123')).toBeNull();
  });

  it('reads a username, lower-cased', () => {
    expect(parseIdentifier('Ustadh.Omar')).toEqual({ kind: 'username', value: 'ustadh.omar' });
    expect(parseIdentifier('a b')).toBeNull();
  });
});

describe('identifierKey: variants share one rate-limit bucket', () => {
  it('folds case, spaces, dashes and the plus sign', () => {
    expect(identifierKey('AB-1234')).toBe(identifierKey('ab 1234'));
    expect(identifierKey('+966500000001')).toBe(identifierKey('00966 500 000 001'));
    expect(identifierKey('Omar')).toBe(identifierKey(' omar '));
    expect(identifierKey('?? x')).toBe(identifierKey('??X'));
  });
});

describe('username', () => {
  it('accepts lower-case names starting with a letter', () => {
    expect(username.parse(' Omar_1 ')).toBe('omar_1');
  });

  it('refuses a digit first, a student-code look-alike, bad characters and bad lengths', () => {
    for (const bad of ['1omar', 'ab-1234', 'ab1234', 'om', 'عمر', 'o'.repeat(31), 'omar!']) expect(username.safeParse(bad).success).toBe(false);
  });
});

describe('codes and family emails', () => {
  it('folds Arabic-Indic digits and spaces in a pasted code', () => {
    expect(codeVerifySchema.parse({ phone: '+966500000001', code: '١٢٣ ٤٥٦' }).code).toBe('123456');
    expect(resetSchema.safeParse({ identifier: 'x', code: '12345', password: 'p' }).success).toBe(false);
  });

  it('knows the synthetic family domain', () => {
    expect(isFamilyEmail('g-1@family.invalid')).toBe(true);
    expect(isFamilyEmail('a@example.com')).toBe(false);
    expect(isFamilyEmail(null)).toBe(false);
  });
});
