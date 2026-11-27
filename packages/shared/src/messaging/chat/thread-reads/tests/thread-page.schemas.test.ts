import { describe, expect, it } from 'vitest';
import { aMessageView } from '../../../../testing';
import { threadDeltaSchema, threadDetailSchema } from '../thread-page.schemas';

const ID = 'c0000000-0000-4000-8000-000000000001';
const AT = '2026-10-02T08:00:00Z';
const PEOPLE = { guardian: null, lead: null, students: [] };
const LESSON = {
  id: ID,
  starts_at: AT,
  meeting_link: null,
  student_names: ['ياسمين'],
  tz: 'Asia/Riyadh',
};

describe('threadDetailSchema', () => {
  it('reads a first page of a number with no messages yet', () => {
    const page = { thread: null, messages: [], has_more: false, lessons: [LESSON], people: PEOPLE };
    expect(threadDetailSchema.parse(page)).toEqual(page);
  });

  it('reads the lessons of a newer cache with their status, end and the chat lists', () => {
    const lesson = { ...LESSON, status: 'confirmed', ends_at: AT };
    const page = {
      thread: null,
      messages: [aMessageView()],
      has_more: true,
      lessons: [lesson],
      people: PEOPLE,
      lists: [{ id: ID, name: 'متابعة' }],
    };
    expect(threadDetailSchema.parse(page)).toEqual(page);
  });

  it('refuses a page without people or with a lesson in an unknown state', () => {
    const page = { thread: null, messages: [], has_more: false, lessons: [] };
    const lessons = [{ ...LESSON, status: 'gone' }];
    expect(threadDetailSchema.safeParse(page).success).toBe(false);
    expect(threadDetailSchema.safeParse({ ...page, people: PEOPLE, lessons }).success).toBe(false);
  });
});

describe('threadDeltaSchema', () => {
  it('reads the rows since the newest one and the rows still moving', () => {
    const delta = { messages: [aMessageView()], has_more: false, pending: [] };
    expect(threadDeltaSchema.parse(delta)).toEqual(delta);
  });

  it('reads the window a new inbound row moved', () => {
    const thread = { last_inbound_at: AT, session_open: true, unread_count: 2 };
    const delta = { messages: [], has_more: false, pending: [], thread };
    expect(threadDeltaSchema.parse(delta)).toEqual(delta);
  });

  it('refuses a delta without its pending rows or with a negative unread count', () => {
    const thread = { last_inbound_at: AT, session_open: true, unread_count: -1 };
    expect(threadDeltaSchema.safeParse({ messages: [], has_more: false }).success).toBe(false);
    const moved = { messages: [], has_more: false, pending: [], thread };
    expect(threadDeltaSchema.safeParse(moved).success).toBe(false);
  });
});
