import { beforeEach, describe, expect, it } from 'vitest';
import { CAL, lessonSource, setup } from './calendar.writer.fixture';
import { eventBody } from './event-format';
import { eventLesson, item, LESSON_ID, TEACHER_ID } from '../../google-sync.fakes';

const origin = (over = {}) => lessonSource({}, over);

describe('CalendarWriter', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => (s = setup(origin())));

  it('creates the teacher event, tagged as ours, and records its id and calendar', async () => {
    const r = await s.writer.write(item(), s.live);
    expect(r).toMatchObject({ state: 'synced', parentId: CAL });
    const [ev] = [...(s.google.events.get(CAL)?.values() ?? [])];
    expect(ev?.extendedProperties.private).toEqual({ ab_source: 'platform', ab_lesson_id: LESSON_ID });
    expect(r.state === 'synced' && r.googleId).toBe(ev?.id);
  });

  it('the main copy goes to the primary calendar', async () => {
    const r = await s.writer.write(item({ kind: 'main_event' }), s.live);
    expect(r).toMatchObject({ state: 'synced', parentId: 'primary' });
    expect(s.map.teacherCalendar).not.toHaveBeenCalled();
  });

  it('same content hash ⇒ no Google call at all (idempotent)', async () => {
    const first = await s.writer.write(item(), s.live);
    if (first.state !== 'synced') throw new Error('not synced');
    s.google.log.length = 0;
    const again = await s.writer.write(item({ google_id: first.googleId, google_parent_id: CAL, content_hash: first.hash }), s.live);
    expect(again).toMatchObject({ state: 'synced', googleId: first.googleId });
    expect(s.google.log).toEqual([]);
  });

  it('an event deleted in Google is gone, never recreated by itself', async () => {
    const r = await s.writer.write(item({ google_id: 'ev-missing', google_parent_id: CAL, content_hash: 'old' }), s.live);
    expect(r).toMatchObject({ state: 'gone' });
    expect(s.google.log.some((l) => l.startsWith('insertEvent'))).toBe(false);
  });

  it('never updates or deletes an event without our tag (a script event)', async () => {
    const cal = new Map([['ev-script', { ...eventBody(eventLesson(), 'teacher'), id: 'ev-script', status: 'confirmed', extendedProperties: { private: {} } }]]);
    s.google.events.set(CAL, cal);
    const upd = await s.writer.write(item({ google_id: 'ev-script', google_parent_id: CAL, content_hash: 'old' }), s.live);
    expect(upd).toMatchObject({ state: 'failed', error: 'not_platform_event' });
    expect(s.google.log.filter((l) => l.startsWith('updateEvent') || l.startsWith('deleteEvent'))).toEqual([]);
  });

  it('a cancelled lesson deletes our own event', async () => {
    const first = await s.writer.write(item(), s.live);
    if (first.state !== 'synced' || !first.googleId) throw new Error('not synced');
    const c = setup(origin({ status: 'cancelled_by_admin' }));
    c.google.calendars.set(CAL, 'x');
    c.google.events.set(CAL, s.google.events.get(CAL) ?? new Map());
    const r = await c.writer.write(item({ google_id: first.googleId, google_parent_id: CAL, state: 'pending' }), c.live);
    expect(r).toMatchObject({ state: 'synced', googleId: null });
    expect(c.google.events.get(CAL)?.size).toBe(0);
  });

  it('an imported lesson of a script-owned teacher is never written', async () => {
    const imp = setup({ ...origin(), origin: false, managed: false });
    expect(await imp.writer.write(item(), imp.live)).toEqual({ state: 'skipped', reason: 'not_platform_origin' });
    expect(imp.google.log).toEqual([]);
  });

  it('an unmapped teacher: skipped with an admin alert, no Google call', async () => {
    s.map.teacherCalendar.mockResolvedValue(null);
    expect(await s.writer.write(item(), s.live)).toEqual({ state: 'skipped', reason: 'teacher_unmapped' });
    expect(s.alerts.teacherUnmapped).toHaveBeenCalledWith({ teacherId: TEACHER_ID, name: 'Teacher A' });
    expect(s.google.log).toEqual([]);
  });

  it('dry_run records the planned request and calls nothing', async () => {
    const r = await s.writer.write(item(), { live: false });
    expect(r).toEqual({ state: 'skipped', reason: 'dry_run', planned: { method: 'POST', target: `calendar:${CAL}`, summary: 'حلقة — طالب تجربة · المنصة' } });
    expect(s.google.log).toEqual([]);
  });

  it('a new teacher calendar: our old event is deleted, a new one created', async () => {
    const first = await s.writer.write(item(), s.live);
    if (first.state !== 'synced') throw new Error('not synced');
    const other = 'other@group.calendar.google.com';
    s.google.calendars.set(other, 'آيات البيان — Teacher B');
    s.map.teacherCalendar.mockResolvedValue(other);
    const r = await s.writer.write(item({ google_id: first.googleId, google_parent_id: CAL, content_hash: first.hash }), s.live);
    expect(r).toMatchObject({ state: 'synced', parentId: other });
    expect(s.google.events.get(CAL)?.size).toBe(0);
    expect(s.google.events.get(other)?.size).toBe(1);
  });
});
