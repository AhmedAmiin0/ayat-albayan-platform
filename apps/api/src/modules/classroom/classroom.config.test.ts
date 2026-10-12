import { describe, expect, it } from 'vitest';
import { CONFIG } from './classroom.fakes';
import { classroomConfigOf, type ClassroomConfig } from './classroom.config';

describe('CLASSROOM_CONFIG source', () => {
  it('a fixed value (tests) as is; a reader (the app) is called on every use', () => {
    expect(classroomConfigOf(CONFIG)).toBe(CONFIG);
    expect(classroomConfigOf(null)).toBeNull();
    let current: ClassroomConfig = null;
    const read = () => current;
    expect(classroomConfigOf(read)).toBeNull();
    current = CONFIG;
    expect(classroomConfigOf(read)).toBe(CONFIG);
  });
});
