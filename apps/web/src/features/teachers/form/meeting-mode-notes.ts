import type { IntegrationConfigItem, TemplateStatus } from '@ab/shared';

export const JOIN_TEMPLATE = 'lesson_join_link';
const LIVEKIT_KEYS = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'] as const;

/** One note under «طريقة حضور الحلقات», in display order. */
export type MeetingModeNote = 'livekitUnset' | 'templateNotApproved' | 'templatePending' | 'templatePaused' | 'noLink';

export interface NotesInput {
  /** The effective mode: usesPlatform(form mode, academy default); null = not known yet (no notes). */
  platform: boolean | null;
  /** The form's fixed link, as typed. */
  link: string;
  /** lesson_join_link's status; null = no row (a restricted list drops it), loading or failed. */
  join: TemplateStatus | null;
  /** LIVEKIT_* all set; null = unknown (loading, failed or forbidden). */
  livekit: boolean | null;
  /** Both lists answered (or failed): until then the fixed-link note waits, so it never flashes on a ready academy. */
  settled: boolean;
}

/** lesson_join_link's row status in GET /messaging/templates; null when the row is not there. */
export function joinStatus(templates: readonly { key: string; status: TemplateStatus }[] | undefined): TemplateStatus | null {
  return templates?.find((x) => x.key === JOIN_TEMPLATE)?.status ?? null;
}

/**
 * Whether the reminders job will find LiveKit configured. reminders.job.ts reads livekitEnv(loadEnv()),
 * and loadEnv() with no argument lays the database's integration values over process.env (the
 * overlay IntegrationConfigService loads), so a key set from the settings page counts exactly like
 * one in the server env: `set` (source 'db' or 'env') is what the job uses. null = no list to read.
 */
export function livekitConfigured(items: readonly Pick<IntegrationConfigItem, 'key' | 'set'>[] | undefined): boolean | null {
  if (!items) return null;
  return LIVEKIT_KEYS.every((key) => items.some((x) => x.key === key && x.set));
}

/**
 * Which notes apply (reminders.links.ts rules): a platform lesson gets no link at all without
 * LiveKit, and families get their join link only once lesson_join_link is approved; a fixed-link
 * teacher with no link gives families our room only when both hold, so their note stays until then.
 * The template notes need the row itself: no row = no note.
 */
export function meetingModeNotes({ platform, link, join, livekit, settled }: NotesInput): MeetingModeNote[] {
  if (platform === null) return [];
  if (!platform) return settled && link.trim() === '' && !(join === 'approved' && livekit === true) ? ['noLink'] : [];
  const notes: MeetingModeNote[] = livekit === false ? ['livekitUnset'] : [];
  if (join === 'pending') notes.push('templatePending');
  // Meta held an approved template: there is nothing to submit, so not the «send it to Meta» note.
  else if (join === 'paused' || join === 'disabled') notes.push('templatePaused');
  else if (join !== null && join !== 'approved') notes.push('templateNotApproved');
  return notes;
}
