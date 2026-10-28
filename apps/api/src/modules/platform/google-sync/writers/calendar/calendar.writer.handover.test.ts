import { describe, expect, it } from 'vitest';
import { CAL, lessonSource, setup } from './calendar.writer.fixture';
import { eventBody } from './event-format';
import { EVENT } from '../../google-format';
import { eventLesson, item, TEACHER_ID } from '../../google-sync.fakes';

// The per-teacher calendar handover (docs/24 «نقل تقويم معلم إلى المنصة»). FakeGoogle only.

/** An imported lesson whose teacher's calendar_owner is 'platform'. */
const handedOver = (lesson = {}) => lessonSource({ origin: false, managed: true }, lesson);
/** The old script's event: no tag, «حلقة — <name>», its sheet line. */
function scriptEvent(startsAt = eventLesson().startsAt) {
  const body = eventBody(eventLesson({ startsAt }), 'teacher');
  const description = `المعلم/ة: Teacher A\n\n${EVENT.scriptFooter} — عدّل في الشيت مش هنا.`;
  return { ...body, summary: 'حلقة — طالب تجربة', description, id: 'ev-script', status: 'confirmed', extendedProperties: { private: {} } };
}
const writes = (log: string[]) => log.filter((l) => /^(insertEvent|updateEvent|deleteEvent)/.test(l));

describe('CalendarWriter: imported lessons of a teacher handed over to the platform', () => {
  it('writes the event of an imported lesson once its teacher is «من المنصة»', async () => {
    const s = setup(handedOver());
    expect(await s.writer.write(item(), s.live)).toMatchObject({ state: 'synced', parentId: CAL });
    expect(s.google.log).toContain(`listEvents ${CAL}`);
    expect([...(s.google.events.get(CAL)?.values() ?? [])][0]?.extendedProperties.private['ab_source']).toBe('platform');
  });

  it('duplicate guard: the script event in that slot ⇒ skipped, one admin alert, no write, the script event untouched', async () => {
    const s = setup(handedOver());
    const foreign = scriptEvent();
    s.google.events.set(CAL, new Map([[foreign.id, foreign]]));
    const r = await s.writer.write(item(), s.live);
    expect(r).toEqual({ state: 'skipped', reason: 'script_event_present', googleId: null, parentId: null });
    expect(s.alerts.scriptStillRunning).toHaveBeenCalledOnce();
    expect(s.alerts.scriptStillRunning).toHaveBeenCalledWith({ teacherId: TEACHER_ID, name: 'Teacher A', since: null });
    expect(writes(s.google.log)).toEqual([]);
    expect(s.google.events.get(CAL)?.get('ev-script')).toEqual(foreign);
  });

  it('the guard covers the main copy too, and heals on the next sweep once the script removed its event', async () => {
    const s = setup(handedOver());
    const mirror = scriptEvent();
    s.google.events.set('primary', new Map([[mirror.id, mirror]]));
    expect(await s.writer.write(item({ kind: 'main_event' }), s.live)).toMatchObject({ state: 'skipped', reason: 'script_event_present' });
    s.google.events.get('primary')?.delete(mirror.id);
    expect(await s.writer.write(item({ kind: 'main_event' }), s.live)).toMatchObject({ state: 'synced', parentId: 'primary' });
  });

  it('a script event at another time, or a cancelled one, is no duplicate', async () => {
    const s = setup(handedOver());
    const other = { ...scriptEvent('2026-10-25T16:00:00Z'), id: 'ev-other' };
    const cancelled = { ...scriptEvent(), id: 'ev-cancelled', status: 'cancelled' };
    s.google.events.set(CAL, new Map([[other.id, other], [cancelled.id, cancelled]]));
    expect(await s.writer.write(item(), s.live)).toMatchObject({ state: 'synced' });
  });

  it('a platform-origin lesson never runs the guard (unchanged behaviour)', async () => {
    const s = setup(lessonSource());
    await s.writer.write(item(), s.live);
    expect(s.google.log.some((l) => l.startsWith('listEvents'))).toBe(false);
  });

  it('dry_run plans the POST and calls nothing', async () => {
    const s = setup(handedOver());
    expect(await s.writer.write(item(), { live: false })).toMatchObject({ state: 'skipped', reason: 'dry_run', planned: { method: 'POST' } });
    expect(s.google.log).toEqual([]);
  });

  it('switched back to «من الشيت»: only our own event goes, the script event stays', async () => {
    const s = setup(handedOver());
    const first = await s.writer.write(item(), s.live);
    if (first.state !== 'synced' || !first.googleId) throw new Error('not synced');
    const foreign = { ...scriptEvent(), id: 'ev-script-later' };
    s.google.events.get(CAL)?.set(foreign.id, foreign);
    s.source.lesson.mockResolvedValue(lessonSource({ origin: false, managed: false }));
    const r = await s.writer.write(item({ google_id: first.googleId, google_parent_id: CAL, content_hash: first.hash }), s.live);
    expect(r).toMatchObject({ state: 'synced', googleId: null });
    expect([...(s.google.events.get(CAL)?.keys() ?? [])]).toEqual([foreign.id]);
    expect(await s.writer.write(item(), s.live)).toEqual({ state: 'skipped', reason: 'not_platform_origin' });
  });
});

describe('CalendarWriter: an imported lesson moved to another teacher follows that teacher', () => {
  const OTHER = 'other@group.calendar.google.com';

  async function written() {
    const s = setup(handedOver());
    s.google.calendars.set(OTHER, 'آيات البيان — Teacher B');
    const first = await s.writer.write(item(), s.live);
    if (first.state !== 'synced' || !first.googleId) throw new Error('not synced');
    return { s, moved: item({ google_id: first.googleId, google_parent_id: CAL, content_hash: first.hash }) };
  }

  it('to a platform-owned teacher: our old event goes, a new one is made on their calendar', async () => {
    const { s, moved } = await written();
    s.map.teacherCalendar.mockResolvedValue(OTHER);
    expect(await s.writer.write(moved, s.live)).toMatchObject({ state: 'synced', parentId: OTHER });
    expect(s.google.events.get(CAL)?.size).toBe(0);
    expect(s.google.events.get(OTHER)?.size).toBe(1);
  });

  it('to a platform-owned teacher whose calendar still has the script event: our old one goes, nothing new', async () => {
    const { s, moved } = await written();
    s.map.teacherCalendar.mockResolvedValue(OTHER);
    const foreign = scriptEvent();
    s.google.events.set(OTHER, new Map([[foreign.id, foreign]]));
    expect(await s.writer.write(moved, s.live)).toEqual({ state: 'skipped', reason: 'script_event_present', googleId: null, parentId: null });
    expect(s.google.events.get(CAL)?.size).toBe(0);
    expect([...(s.google.events.get(OTHER)?.keys() ?? [])]).toEqual([foreign.id]);
  });

  it('to a script-owned teacher: our old event goes, nothing is written for them', async () => {
    const { s, moved } = await written();
    s.source.lesson.mockResolvedValue(lessonSource({ origin: false, managed: false }));
    expect(await s.writer.write(moved, s.live)).toMatchObject({ state: 'synced', googleId: null });
    expect(s.google.events.get(CAL)?.size).toBe(0);
    expect(s.google.log.filter((l) => l.startsWith('insertEvent'))).toHaveLength(1);
  });
});
