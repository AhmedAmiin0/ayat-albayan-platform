import { describe, expect, it } from 'vitest';
import { templateCreateSchema } from './template-create.js';

// «قالب جديد» (owner 2026-10-31): what the API accepts for a brand-new template.

const base = { key: 'welcome_back', line: 'chat', category: 'utility', body: 'Hello {{1}}, see you soon.' };
const ok = (over: object) => templateCreateSchema.safeParse({ ...base, ...over }).success;

describe('templateCreateSchema', () => {
  it('fills the defaults: Arabic, no header / footer / params / buttons', () => {
    expect(templateCreateSchema.parse(base)).toEqual({ ...base, language: 'ar', header: null, footer: null, params: [], buttons: [] });
  });

  it('a blank header or footer is none; a variable in either is refused', () => {
    expect(templateCreateSchema.parse({ ...base, header: '  ', footer: '' })).toMatchObject({ header: null, footer: null });
    expect(ok({ header: 'Hi {{1}}' })).toBe(false);
    expect(ok({ footer: 'Bye {{1}}' })).toBe(false);
  });

  it('key: Meta name rules only (lower case, digits, underscore)', () => {
    expect(ok({ key: 'Welcome' })).toBe(false);
    expect(ok({ key: 'welcome-back' })).toBe(false);
    expect(ok({ key: 'welcome_2' })).toBe(true);
  });

  it('category utility / marketing only; a language like ar or en_US', () => {
    expect(ok({ category: 'authentication' })).toBe(false);
    expect(ok({ language: 'en_US' })).toBe(true);
    expect(ok({ language: 'english' })).toBe(false);
  });

  it('params: a name and a sample each, at most nine', () => {
    const p = { name: 'student_name', sample: 'Sara' };
    expect(ok({ params: [p] })).toBe(true);
    expect(ok({ params: [{ name: 'Student', sample: 'x' }] })).toBe(false);
    expect(ok({ params: [{ name: 'var_1', sample: ' ' }] })).toBe(false);
    expect(ok({ params: Array.from({ length: 10 }, () => p) })).toBe(false);
  });

  it('buttons: https URL with at most a {{1}} suffix, one URL button, three in all, a known reply action', () => {
    const url = { type: 'url', text: 'Open', url: 'https://example.com/join/{{1}}' };
    const reply = { type: 'quick_reply', text: 'Yes', intent: 'confirm' };
    expect(ok({ buttons: [url, reply] })).toBe(true);
    expect(ok({ buttons: [{ ...url, url: 'http://example.com' }] })).toBe(false);
    expect(ok({ buttons: [{ ...url, url: 'https://example.com/{{1}}/x' }] })).toBe(false);
    expect(ok({ buttons: [url, url] })).toBe(false);
    expect(ok({ buttons: [reply, reply, reply, reply] })).toBe(false);
    expect(ok({ buttons: [{ ...reply, intent: 'rate_good' }] })).toBe(false);
    expect(ok({ buttons: [{ ...reply, text: 'x'.repeat(26) }] })).toBe(false);
  });
});
