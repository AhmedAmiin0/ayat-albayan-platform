import { describe, expect, it } from 'vitest';
import { isNewReport, newReportCount, parseSeen, withSeen } from './report-seen.js';
import { childTabs, familyChatOn, familyMeetingsOn, portalViewer, seesMoney } from './viewer.js';

const self = { contact_is_self: true };
const child = { contact_is_self: false };

describe('who sees money (docs/50 §4)', () => {
  it('a guardian and an adult who is their own contact; never a child', () => {
    expect(portalViewer('guardian', child)).toBe('guardian');
    expect(portalViewer('student', self)).toBe('adult');
    expect(portalViewer('student', child)).toBe('child');
    expect(['guardian', 'adult', 'child'].map((v) => seesMoney(v as 'child'))).toEqual([true, true, false]);
  });
});

describe('childTabs', () => {
  it('a child: no package; the chat while the setting is on (owner 2026-11-16)', () => {
    const base = ['upcoming', 'attended', 'absent', 'recordings'];
    expect(childTabs({ kind: 'student', student: child, chatOn: false })).toEqual(base);
    expect(childTabs({ kind: 'student', student: child, chatOn: true })).toEqual([...base, 'chat']);
  });

  it('a guardian: the package; the chat only while the setting is on', () => {
    const base = ['upcoming', 'attended', 'absent', 'recordings', 'package'];
    expect(childTabs({ kind: 'guardian', student: child, chatOn: false })).toEqual(base);
    expect(childTabs({ kind: 'guardian', student: child, chatOn: true })).toEqual([...base, 'chat']);
    expect(childTabs({ kind: 'student', student: self, chatOn: true })).toEqual([...base, 'chat']);
  });
});

describe('familyChatOn', () => {
  it('reads the public setting; off while unknown or malformed', () => {
    expect(familyChatOn({ family_chat_enabled: true })).toBe(true);
    expect(familyChatOn({ family_chat_enabled: false })).toBe(false);
    expect(familyChatOn({ family_chat_enabled: 'yes' })).toBe(false);
    expect(familyChatOn({})).toBe(false);
    expect(familyChatOn(undefined)).toBe(false);
  });
});

describe('familyMeetingsOn', () => {
  it('reads the public setting; off (the browser) while unknown or malformed', () => {
    expect(familyMeetingsOn({ family_meetings_in_app: true })).toBe(true);
    expect(familyMeetingsOn({ family_meetings_in_app: false })).toBe(false);
    expect(familyMeetingsOn({ family_meetings_in_app: 1 })).toBe(false);
    expect(familyMeetingsOn({ family_chat_enabled: true })).toBe(false);
    expect(familyMeetingsOn(null)).toBe(false);
  });
});

describe('«جديد» on reports not opened on this device', () => {
  it('reads the stored ids; anything unreadable is nothing seen', () => {
    expect(parseSeen('["r1","r2"]')).toEqual(['r1', 'r2']);
    expect(parseSeen(null)).toEqual([]);
    expect(parseSeen('{oops')).toEqual([]);
    expect(parseSeen('[1]')).toEqual([]);
  });

  it('adds an id once, newest last, and counts the new ones', () => {
    expect(withSeen(['r1', 'r2'], 'r1')).toEqual(['r2', 'r1']);
    expect(withSeen(Array.from({ length: 500 }, (_, i) => `r${i}`), 'x')).toHaveLength(500);
    expect(isNewReport('r3', ['r1'])).toBe(true);
    expect(newReportCount([{ id: 'r1' }, { id: 'r3' }], ['r1'])).toBe(1);
  });
});
