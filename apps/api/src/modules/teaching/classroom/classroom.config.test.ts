import { describe, expect, it } from 'vitest';
import { CONFIG } from './classroom.fakes';
import { classroomConfigOf, firstWebOrigin, type ClassroomConfig } from './classroom.config';

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

describe('firstWebOrigin', () => {
  it('the first of the comma list, trimmed, without a trailing slash', () => {
    expect(firstWebOrigin(' https://app.ayatalbayan.com/ , http://localhost:5173')).toBe('https://app.ayatalbayan.com');
    expect(firstWebOrigin('http://localhost:5173')).toBe('http://localhost:5173');
  });
});
