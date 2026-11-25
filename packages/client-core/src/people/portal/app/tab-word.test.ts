import { describe, expect, it } from 'vitest';
import { childTabPill, childTabWord, type ChildTabWords } from './tab-word';

const WORDS: ChildTabWords = {
  portal: {
    upcomingTab: 'up',
    attendedTab: 'attended',
    absentTab: 'absent',
    packageTab: 'package',
    app: {
      child: {
        attendedSelf: 'attended-self', absentSelf: 'absent-self', chat: 'chat', chatUnread: 'chat {n}',
      },
    },
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

describe('childTabPill', () => {
  it('«المحادثة» carries its unread count and its spoken name', () => {
    expect(childTabPill('chat', { own: false, unread: 3 }, WORDS)).toEqual({
      value: 'chat',
      label: 'chat',
      badge: { count: 3, label: 'chat 3' },
    });
  });

  it('every other tab is its word only, in the viewer’s own words', () => {
    expect(childTabPill('attended', { own: true, unread: 3 }, WORDS)).toEqual({
      value: 'attended',
      label: 'attended-self',
    });
  });
});
