import { t } from '@/core/lib/i18n/i18n';
import { huda } from '../fixtures';
import { followUpLines } from './follow-up-text';
import type { LeadProfile } from './queries';

const f = t.followUps;
const due: LeadProfile = {
  ...huda,
  status: 'no_reply',
  follow_up_paused: false,
  follow_up_paused_by: null,
  follow_up_stage: 1,
  // Sunday 4 October 2026, 14:00 UTC = 17:00 in Riyadh.
  next_follow_up_at: '2026-10-04T14:00:00Z',
  follow_up_note: null,
};

test('due: when, in the given zone, then how many of the settings’ follow-ups went out', () => {
  expect(followUpLines(due, 3, 'Asia/Riyadh')).toEqual([
    f.next.replace('{time}', 'الأحد 4 أكتوبر 17:00'),
    f.stage.replace('{n}', '1').replace('{total}', '3'),
  ]);
});

test('no stage line before the first one went out, or before /settings loads', () => {
  expect(followUpLines({ ...due, follow_up_stage: 0 }, 3, 'Asia/Riyadh')).toHaveLength(1);
  expect(followUpLines(due, undefined, 'Asia/Riyadh')).toHaveLength(1);
});

test('who paused it: the admin, or the lead who sent «وقف»', () => {
  expect(followUpLines({ ...due, follow_up_paused: true, follow_up_paused_by: 'admin' }, 3, 'UTC')).toEqual([f.paused]);
  expect(followUpLines({ ...due, follow_up_paused: true, follow_up_paused_by: 'lead' }, 3, 'UTC')).toEqual([f.pausedByLead]);
});

test('why a due follow-up has not gone out replaces the time', () => {
  expect(followUpLines({ ...due, follow_up_note: 'waiting_template' }, 3, 'UTC')[0]).toBe(f.waitingTemplate);
  expect(followUpLines({ ...due, follow_up_note: 'no_slots' }, 3, 'UTC')[0]).toBe(f.noSlots);
  expect(followUpLines({ ...due, follow_up_note: 'queued' }, 3, 'UTC')[0]).toBe(f.queued);
});

test('nothing scheduled: a status the automation skips, or no due time; old cached rows too', () => {
  expect(followUpLines({ ...due, status: 'trial_booked' }, 3, 'UTC')).toEqual([f.none]);
  expect(followUpLines({ ...due, next_follow_up_at: null, follow_up_stage: 0 }, 3, 'UTC')).toEqual([f.none]);
  expect(followUpLines(huda, 3, 'UTC')).toEqual([f.none]);
});
