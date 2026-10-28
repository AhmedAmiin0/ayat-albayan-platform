import { Injectable } from '@nestjs/common';
import { contentHash } from './content-hash';
import { eventBody, eventWanted, isOurEvent, type EventCopy } from './event-format';
import { scriptEventAt } from './script-guard';
import { GoogleAlerts } from '../../google-alerts';
import { GoogleApiError, type EventRef, type GoogleClient, type GoogleEventBody } from '../../google-client.port';
import type { ItemResult, SyncItem } from '../../sync/google-items.queries';
import { GoogleMapQueries } from '../../map/google-map.queries';
import { GoogleSyncSource, type LessonSource } from '../../sync/google-sync.source';
import { planned, synced, type ItemWriter, type WriteCtx } from '../../sync/write-context';

const MAIN_CALENDAR = 'primary';

/** Deletes only an event that carries our tag for this lesson; `foreign` = not ours, left untouched. */
async function deleteOwn(google: GoogleClient, input: { calendarId: string; eventId: string; lessonId: string }): Promise<'deleted' | 'gone' | 'foreign'> {
  const ev = await google.getEvent({ calendarId: input.calendarId, eventId: input.eventId });
  if (!ev || ev.status === 'cancelled') return 'gone';
  if (!isOurEvent(ev, input.lessonId)) return 'foreign';
  try {
    await google.deleteEvent({ calendarId: input.calendarId, eventId: input.eventId });
    return 'deleted';
  } catch (e) {
    if (e instanceof GoogleApiError && (e.status === 404 || e.status === 410)) return 'gone';
    throw e;
  }
}

/**
 * teacher_event / main_event (docs/24 §3): one single event per calendar-managed lesson (platform-origin,
 * or any lesson of a teacher whose calendar_owner is 'platform') on the teacher's confirmed calendar, and
 * its copy on the academy's main calendar. It only ever reads, updates or deletes the event id it
 * recorded, after checking our extendedProperties tag; an event someone deleted is `gone` and is not
 * recreated until the lesson changes again (§2.4). Before inserting an imported lesson's event, the
 * duplicate guard looks for the script's event in that slot and, if found, writes nothing.
 */
@Injectable()
export class CalendarWriter implements ItemWriter {
  constructor(
    private readonly source: GoogleSyncSource,
    private readonly map: GoogleMapQueries,
    private readonly alerts: GoogleAlerts,
  ) {}

  async write(item: SyncItem, ctx: WriteCtx): Promise<ItemResult> {
    const src = await this.source.lesson(item.subject_id);
    const copy: EventCopy = item.kind === 'main_event' ? 'main' : 'teacher';
    const wanted = !!src && src.managed && eventWanted(src.lesson.status);
    if (!wanted) return this.remove(item, { ctx, imported: !!src && !src.managed });
    const calendarId = copy === 'main' ? MAIN_CALENDAR : await this.map.teacherCalendar(src.teacherId);
    if (!calendarId) {
      await this.alerts.teacherUnmapped({ teacherId: src.teacherId, name: src.lesson.teacherName });
      return { state: 'skipped', reason: 'teacher_unmapped' };
    }
    const event = eventBody(src.lesson, copy);
    const hash = contentHash({ calendarId, event });
    const moved = item.google_id !== null && item.google_parent_id !== calendarId;
    if (item.google_id && !moved && hash === item.content_hash) return synced({ googleId: item.google_id, parentId: calendarId, hash });
    const method = !item.google_id || moved ? 'POST' : 'PUT';
    if (!ctx.live) return planned({ method, target: `calendar:${calendarId}`, summary: event.summary });
    const { google } = ctx;
    if (method === 'PUT' && item.google_id) return this.update({ google, calendarId, eventId: item.google_id, item, event, hash });
    const held = await this.beforeInsert(item, { google, calendarId, src });
    if (held) return held;
    const made = await google.insertEvent({ calendarId, event });
    return synced({ googleId: made.id, parentId: calendarId, hash });
  }

  /** Our own event, after checking our tag; deleted in Google ⇒ gone (§2.4). */
  private async update(input: EventRef & { google: GoogleClient; item: SyncItem; event: GoogleEventBody; hash: string }): Promise<ItemResult> {
    const { google, calendarId, eventId, item, event, hash } = input;
    const ev = await google.getEvent({ calendarId, eventId });
    if (!ev || ev.status === 'cancelled') return { state: 'gone', error: 'deleted_in_google' };
    if (!isOurEvent(ev, item.subject_id)) return { state: 'failed', error: 'not_platform_event', attempts: item.attempts };
    try {
      await google.updateEvent({ calendarId, eventId, event });
    } catch (e) {
      if (e instanceof GoogleApiError && (e.status === 404 || e.status === 410)) return { state: 'gone', error: 'deleted_in_google' };
      throw e;
    }
    return synced({ googleId: eventId, parentId: calendarId, hash });
  }

  /**
   * Before a new event: our old one on the previous calendar goes (a new teacher calendar), then the
   * duplicate guard for an imported lesson — the script's event in that slot ⇒ one alert, write nothing.
   */
  private async beforeInsert(item: SyncItem, input: { google: GoogleClient; calendarId: string; src: LessonSource }): Promise<ItemResult | null> {
    const { google, calendarId, src } = input;
    if (item.google_id && item.google_parent_id) {
      const old = await deleteOwn(google, { calendarId: item.google_parent_id, eventId: item.google_id, lessonId: item.subject_id });
      if (old === 'foreign') return { state: 'failed', error: 'not_platform_event', attempts: item.attempts };
    }
    if (src.origin || !(await scriptEventAt(google, { calendarId, startsAt: src.lesson.startsAt }))) return null;
    await this.alerts.scriptStillRunning({ teacherId: src.teacherId, name: src.lesson.teacherName, since: src.ownerChangedAt });
    return { state: 'skipped', reason: 'script_event_present', googleId: null, parentId: null };
  }

  /** Cancelled / moved / not calendar-managed: remove our own event if we made one, else nothing. */
  private async remove(item: SyncItem, input: { ctx: WriteCtx; imported: boolean }): Promise<ItemResult> {
    const { ctx } = input;
    if (!item.google_id || !item.google_parent_id) {
      return input.imported ? { state: 'skipped', reason: 'not_platform_origin' } : synced({ googleId: null, parentId: null, hash: null });
    }
    if (!ctx.live) return planned({ method: 'DELETE', target: `calendar:${item.google_parent_id}`, summary: item.google_id });
    const out = await deleteOwn(ctx.google, { calendarId: item.google_parent_id, eventId: item.google_id, lessonId: item.subject_id });
    if (out === 'foreign') return { state: 'failed', error: 'not_platform_event', attempts: item.attempts };
    return synced({ googleId: null, parentId: null, hash: null });
  }
}
