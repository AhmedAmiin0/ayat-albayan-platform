import type { IntegrationKey } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { joinStatus, livekitConfigured, meetingModeNotes, type NotesInput } from './meeting-mode-notes';

const LINK = 'https://meet.google.com/xqa-ngdu-fpe';
const notes = (over: Partial<NotesInput>) =>
  meetingModeNotes({ platform: true, link: '', join: 'approved', livekit: true, ...over });

describe('joinStatus', () => {
  it('reads lesson_join_link’s row; no row (a restricted list) is null, not «not approved»', () => {
    expect(joinStatus([{ key: 'lesson_join_link', status: 'pending' }])).toBe('pending');
    expect(joinStatus([{ key: 'lesson_reminder_24h', status: 'approved' }])).toBeNull();
    expect(joinStatus(undefined)).toBeNull();
  });
});

describe('livekitConfigured (what reminders.job.ts reads: env with the database overlay)', () => {
  const keys: IntegrationKey[] = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'];
  const all = (set: boolean) => keys.map((key) => ({ key, set }));
  it('all three set, from the env or the database: configured', () => {
    expect(livekitConfigured(all(true))).toBe(true);
  });
  it('one missing: not configured; no list: unknown', () => {
    expect(livekitConfigured(all(true).slice(1))).toBe(false);
    expect(livekitConfigured(all(false))).toBe(false);
    expect(livekitConfigured(undefined)).toBeNull();
  });
});

describe('meetingModeNotes', () => {
  it('mode not known yet: no notes', () => {
    expect(notes({ platform: null, join: 'not_submitted', livekit: false })).toEqual([]);
  });

  it('platform with no lesson_join_link row: no template note', () => {
    expect(notes({ join: null })).toEqual([]);
  });

  it('platform: the row not approved, or waiting for Meta, each with its own note', () => {
    expect(notes({ join: 'not_submitted' })).toEqual(['templateNotApproved']);
    expect(notes({ join: 'rejected' })).toEqual(['templateNotApproved']);
    expect(notes({ join: 'pending' })).toEqual(['templatePending']);
  });

  it('platform without LiveKit: the server note first; unknown LiveKit says nothing', () => {
    expect(notes({ livekit: false, join: 'pending' })).toEqual(['livekitUnset', 'templatePending']);
    expect(notes({ livekit: null })).toEqual([]);
  });

  it('fixed link without a link: families get our room only once the template is approved and LiveKit is set', () => {
    expect(notes({ platform: false })).toEqual([]);
    expect(notes({ platform: false, join: 'pending' })).toEqual(['noLink']);
    expect(notes({ platform: false, livekit: false })).toEqual(['noLink']);
    expect(notes({ platform: false, join: null, livekit: null })).toEqual(['noLink']);
  });

  it('fixed link with a link: no note', () => {
    expect(notes({ platform: false, link: LINK, join: null, livekit: false })).toEqual([]);
  });
});
