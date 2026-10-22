import { Injectable } from '@nestjs/common';
import { contentHash } from './content-hash';
import { eventBody, eventWanted, isOurEvent, type EventCopy } from './event-format';
import { GoogleAlerts } from './google-alerts';
import { GoogleApiError, type GoogleClient } from './google-client.port';
import type { ItemResult, SyncItem } from './google-items.queries';
import { GoogleMapQueries } from './google-map.queries';
import { GoogleSyncSource } from './google-sync.source';
import { planned, synced, type ItemWriter, type WriteCtx } from './write-context';

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
 * teacher_event / main_event (docs/24 §3): one single event per platform-origin lesson on the
 * teacher's confirmed calendar, and its copy on the academy's main calendar. It only ever reads,
 * updates or deletes the event id it recorded, after checking our extendedProperties tag; an event
 * someone deleted is `gone` and is not recreated until the lesson changes again (§2.4).
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
    const wanted = !!src && src.origin && eventWanted(src.lesson.status);
    if (!wanted) return this.remove(item, { ctx, imported: !!src && !src.origin });
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
    if (item.google_id && moved && item.google_parent_id) {
      const old = await deleteOwn(google, { calendarId: item.google_parent_id, eventId: item.google_id, lessonId: item.subject_id });
      if (old === 'foreign') return { state: 'failed', error: 'not_platform_event', attempts: item.attempts };
    }
    if (item.google_id && !moved) {
      const ev = await google.getEvent({ calendarId, eventId: item.google_id });
      if (!ev || ev.status === 'cancelled') return { state: 'gone', error: 'deleted_in_google' };
      if (!isOurEvent(ev, item.subject_id)) return { state: 'failed', error: 'not_platform_event', attempts: item.attempts };
      try {
        await google.updateEvent({ calendarId, eventId: item.google_id, event });
      } catch (e) {
        if (e instanceof GoogleApiError && (e.status === 404 || e.status === 410)) return { state: 'gone', error: 'deleted_in_google' };
        throw e;
      }
      return synced({ googleId: item.google_id, parentId: calendarId, hash });
    }
    const made = await google.insertEvent({ calendarId, event });
    return synced({ googleId: made.id, parentId: calendarId, hash });
  }

  /** Cancelled / moved / not platform-origin: remove our own event if we made one, else nothing. */
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
