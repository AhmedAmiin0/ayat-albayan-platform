import { describe, expect, it } from 'vitest';
import { guestJoinSchema } from './schemas.js';
import { CHAT_TOPIC, chatOpen, CLASSROOM_ERRORS, dropsChat, JOIN_ROLES, lessonRoomName } from './room.js';
import ar from '../../i18n/ar.json' with { type: 'json' };
import en from '../../i18n/en.json' with { type: 'json' };

describe('lessonRoomName', () => {
  it('is lesson-<id>', () => {
    expect(lessonRoomName('0b1c2d3e-0000-4000-8000-000000000001')).toBe('lesson-0b1c2d3e-0000-4000-8000-000000000001');
  });
});

describe('guestJoinSchema', () => {
  it('trims the name and keeps 1 to 30 characters', () => {
    expect(guestJoinSchema.parse({ name: '  سهيلة  ' }).name).toBe('سهيلة');
    expect(guestJoinSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(guestJoinSchema.safeParse({ name: 'x'.repeat(31) }).success).toBe(false);
    expect(guestJoinSchema.safeParse({}).success).toBe(false);
  });
});

describe('classroom wording', () => {
  it.each(CLASSROOM_ERRORS)('has a message for %s in both languages', (code) => {
    expect(ar.classroom.error[code]).toBeTruthy();
    expect(en.classroom.error[code]).toBeTruthy();
  });

  it.each(JOIN_ROLES)('names the role %s in both languages', (role) => {
    expect(ar.classroom.roles[role]).toBeTruthy();
    expect(en.classroom.roles[role]).toBeTruthy();
  });

  it('keeps the owner wording of the two buttons', () => {
    expect(ar.classroom.enter).toBe('ادخل الحلقة');
    expect(ar.classroom.sendLink).toBe('أرسل رابط الحلقة');
  });
});

describe('text chat in the room (owner, 2026-10-11: none in a trial lesson)', () => {
  it('is open unless the join says chat: false', () => {
    expect(chatOpen({ chat: false })).toBe(false);
    expect(chatOpen({ chat: true })).toBe(true);
    expect(chatOpen({})).toBe(true);
  });

  it('drops only chat-topic data, and only while chat is off', () => {
    expect(dropsChat(false, CHAT_TOPIC)).toBe(true);
    expect(dropsChat(false, 'board')).toBe(false);
    expect(dropsChat(false, 'share-request')).toBe(false);
    expect(dropsChat(false, undefined)).toBe(false);
    expect(dropsChat(true, CHAT_TOPIC)).toBe(false);
  });

  it('the trial note reads in both languages', () => {
    expect(ar.classroom.chatClosedTrial).toBe('المحادثة النصية مغلقة في الحلقات التجريبية.');
    expect(en.classroom.chatClosedTrial).toBe('Text chat is closed in trial lessons.');
  });
});
