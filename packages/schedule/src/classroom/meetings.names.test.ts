import { describe, expect, it } from 'vitest';
import { firstName, roomNameOfStudent } from './meetings';

describe('roomNameOfStudent', () => {
  it('the first name of the student', () => {
    expect(firstName('  سهيلة محمد ')).toBe('سهيلة');
    expect(roomNameOfStudent('سهيلة محمد')).toBe('سهيلة');
  });

  it('never empty, never past 30 characters', () => {
    expect(roomNameOfStudent('   ')).toBe('   ');
    expect(roomNameOfStudent('x'.repeat(40))).toHaveLength(30);
  });
});
