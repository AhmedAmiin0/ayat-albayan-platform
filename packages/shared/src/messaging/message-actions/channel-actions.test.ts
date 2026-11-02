import { describe, expect, it } from 'vitest';
import {
  CHANNEL_DELETE_WINDOW_MS,
  CHANNEL_EDIT_WINDOW_MS,
  channelActions,
} from './channel-actions.js';

const at = '2026-10-30T10:00:00.000Z';
const now = (ms: number) => new Date(Date.parse(at) + ms);
const mine = { mine: true, created_at: at, deleted: false };

describe('channel edit / delete rule (owner 2026-10-30)', () => {
  it('the sender edits within 15 minutes and deletes within 48 hours', () => {
    expect(
      channelActions({ message: mine, moderator: false, now: now(CHANNEL_EDIT_WINDOW_MS) }),
    ).toEqual({ edit: true, delete: true });
    expect(
      channelActions({ message: mine, moderator: false, now: now(CHANNEL_EDIT_WINDOW_MS + 1) }),
    ).toEqual({ edit: false, delete: true });
    expect(
      channelActions({ message: mine, moderator: false, now: now(CHANNEL_DELETE_WINDOW_MS + 1) }),
    ).toEqual({ edit: false, delete: false });
  });

  it('another participant gets nothing; a moderator deletes any message, never edits', () => {
    const theirs = { ...mine, mine: false };
    expect(channelActions({ message: theirs, moderator: false, now: now(0) })).toEqual({
      edit: false,
      delete: false,
    });
    expect(
      channelActions({ message: theirs, moderator: true, now: now(CHANNEL_DELETE_WINDOW_MS * 10) }),
    ).toEqual({ edit: false, delete: true });
  });

  it('a deleted message offers nothing to anyone', () => {
    const gone = { ...mine, deleted: true };
    expect(channelActions({ message: gone, moderator: false, now: now(0) })).toEqual({
      edit: false,
      delete: false,
    });
    expect(channelActions({ message: gone, moderator: true, now: now(0) })).toEqual({
      edit: false,
      delete: false,
    });
  });
});
