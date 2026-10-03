import { describe, expect, it } from 'vitest';
import { canRemove, participantMeta, roleOfMeta } from './moderation.js';

describe('classroom moderation', () => {
  it('admin removes anyone but an admin; the teacher removes guests, assistants and sales', () => {
    expect(canRemove('admin', 'teacher')).toBe(true);
    expect(canRemove('admin', 'guest')).toBe(true);
    expect(canRemove('admin', 'admin')).toBe(false);
    expect(canRemove('teacher', 'guest')).toBe(true);
    expect(canRemove('teacher', 'assistant')).toBe(true);
    expect(canRemove('teacher', 'sales')).toBe(true);
    expect(canRemove('teacher', 'admin')).toBe(false);
    expect(canRemove('teacher', 'teacher')).toBe(false);
    expect(canRemove('guest', 'guest')).toBe(false);
    expect(canRemove('assistant', 'guest')).toBe(false);
  });

  it('metadata carries the role only and reads back; junk reads as null', () => {
    expect(participantMeta('teacher')).toBe('{"role":"teacher"}');
    expect(roleOfMeta(participantMeta('guest'))).toBe('guest');
    expect(roleOfMeta('')).toBeNull();
    expect(roleOfMeta('{oops')).toBeNull();
    expect(roleOfMeta(undefined)).toBeNull();
  });
});
