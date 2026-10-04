import { describe, expect, it } from 'vitest';
import { canJoinNow, joinWindow } from './join-window.js';

const lesson = { starts_at: '2026-10-05T16:00:00.000Z', ends_at: '2026-10-05T17:00:00.000Z' };
const at = (iso: string) => new Date(iso);

describe('joinWindow with room_opened_at («افتح الحلقة الآن»)', () => {
  it('opens when staff opened the room, when that is earlier than 15 minutes before', () => {
    const opened = { ...lesson, room_opened_at: '2026-10-05T14:00:00.000Z' };
    expect(joinWindow(opened, at('2026-10-05T13:59:59Z')).state).toBe('early');
    expect(joinWindow(opened, at('2026-10-05T14:00:00Z')).state).toBe('open');
    expect(joinWindow(opened, at('2026-10-05T14:00:00Z')).opens_at).toBe('2026-10-05T14:00:00.000Z');
    expect(canJoinNow(opened, at('2026-10-05T15:00:00Z'))).toBe(true);
  });

  it('never opens later than the usual 15 minutes before', () => {
    const late = { ...lesson, room_opened_at: '2026-10-05T16:10:00.000Z' };
    expect(joinWindow(late, at('2026-10-05T15:50:00Z')).opens_at).toBe('2026-10-05T15:45:00.000Z');
  });

  it('ignores null and unreadable values', () => {
    expect(joinWindow({ ...lesson, room_opened_at: null }, at('2026-10-05T15:00:00Z')).state).toBe('early');
    expect(joinWindow({ ...lesson, room_opened_at: 'x' }, at('2026-10-05T15:00:00Z')).state).toBe('early');
  });

  it('keeps the close edge: 2 hours after the end', () => {
    const opened = { ...lesson, room_opened_at: '2026-10-05T14:00:00.000Z' };
    expect(joinWindow(opened, at('2026-10-05T19:00:00Z')).state).toBe('open');
    expect(joinWindow(opened, at('2026-10-05T19:00:01Z')).state).toBe('closed');
  });
});
