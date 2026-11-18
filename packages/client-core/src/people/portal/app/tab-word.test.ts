import { describe, expect, it } from 'vitest';
import { childTabWord, type ChildTabWords } from './tab-word.js';

const WORDS: ChildTabWords = {
  portal: {
    upcomingTab: 'up',
    attendedTab: 'attended',
    absentTab: 'absent',
    packageTab: 'package',
    app: { child: { attendedSelf: 'attended-self', absentSelf: 'absent-self', chat: 'chat' } },
  },
  lessonFiles: { recordings: 'recordings' },
};

describe('childTabWord', () => {
  it('a login reading its own page says «حضرتها», a guardian their child’s', () => {
    expect(childTabWord('attended', true, WORDS)).toBe('attended-self');
    expect(childTabWord('absent', true, WORDS)).toBe('absent-self');
    expect(childTabWord('attended', false, WORDS)).toBe('attended');
    expect(childTabWord('absent', false, WORDS)).toBe('absent');
  });

  it('the other tabs read the same for both', () => {
    for (const own of [true, false]) {
      expect(childTabWord('upcoming', own, WORDS)).toBe('up');
      expect(childTabWord('recordings', own, WORDS)).toBe('recordings');
      expect(childTabWord('package', own, WORDS)).toBe('package');
      expect(childTabWord('chat', own, WORDS)).toBe('chat');
    }
  });
});
