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

/**
 * lesson_join_link's status → its note on a platform lesson. Meta held an approved template
 * (paused, disabled): there is nothing to submit, so not the «send it to Meta» note.
 */
const JOIN_NOTE = {
  approved: null,
  pending: 'templatePending',
  paused: 'templatePaused',
  disabled: 'templatePaused',
  not_submitted: 'templateNotApproved',
  rejected: 'templateNotApproved',
  missing: 'templateNotApproved',
} as const satisfies Record<TemplateStatus, MeetingModeNote | null>;

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
  return platform ? platformNotes(join, livekit) : fixedLinkNotes({ link, join, livekit, settled });
}

/** A platform lesson: the LiveKit note first, then lesson_join_link's own (none without a row). */
function platformNotes(join: TemplateStatus | null, livekit: boolean | null): MeetingModeNote[] {
  const server: MeetingModeNote[] = livekit === false ? ['livekitUnset'] : [];
  const template = join === null ? null : JOIN_NOTE[join];
  return template ? [...server, template] : server;
}

/** A fixed-link teacher with no link: our room reaches families only once both hold. */
function fixedLinkNotes(input: Omit<NotesInput, 'platform'>): MeetingModeNote[] {
  const roomReady = input.join === 'approved' && input.livekit === true;
  const missing = input.settled && input.link.trim() === '' && !roomReady;
  return missing ? ['noLink'] : [];
}
