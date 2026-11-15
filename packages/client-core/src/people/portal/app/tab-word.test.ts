import { describe, expect, it } from 'vitest';
import { childTabWord, type ChildTabWords } from './tab-word.js';

const WORDS: ChildTabWords = {
  upcomingTab: 'up',
  attendedTab: 'attended',
  absentTab: 'absent',
  packageTab: 'package',
  app: { child: { attendedSelf: 'attended-self', absentSelf: 'absent-self', chat: 'chat' } },
};

describe('childTabWord', () => {
  it('a student reads their own page, a guardian their child’s', () => {
    expect(childTabWord('attended', 'student', WORDS)).toBe('attended-self');
    expect(childTabWord('absent', 'student', WORDS)).toBe('absent-self');
    expect(childTabWord('attended', 'guardian', WORDS)).toBe('attended');
    expect(childTabWord('absent', 'guardian', WORDS)).toBe('absent');
  });

  it('the other tabs read the same for both', () => {
    for (const kind of ['guardian', 'student'] as const) {
      expect(childTabWord('upcoming', kind, WORDS)).toBe('up');
      expect(childTabWord('package', kind, WORDS)).toBe('package');
      expect(childTabWord('chat', kind, WORDS)).toBe('chat');
    }
  });
});
