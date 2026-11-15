import { describe, expect, it } from 'vitest';
import { linkLessonId } from './link-lesson';

const LESSON = '0b9f3c2e-1a2b-4c3d-8e4f-5a6b7c8d9e0f';

describe('linkLessonId: /teacher-report/<lesson id> vs an older signed token', () => {
  it('a lesson id goes to the portal page', () => {
    expect(linkLessonId(LESSON)).toBe(LESSON);
  });

  it('a signed token (or anything else) keeps the no-login form', () => {
    for (const param of ['eyJsIjoiYSJ9.c2ln', `${LESSON}.sig`, 'teacher', '']) {
      expect(linkLessonId(param)).toBeNull();
    }
  });
});
