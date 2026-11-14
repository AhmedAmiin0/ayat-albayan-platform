import type { TemplateStatus } from '@ab/catalog';

// Meta's limits on editing a template it knows (WhatsApp Business Management API, «Edit a message
// template»): only an approved, rejected or paused one can be edited; an APPROVED one at most once
// a day and 10 times in 30 days (a rejected or paused one without limit); the name and the category
// never change; every edit goes back to review (status pending).

export const EDIT_LIMITS = { perDay: 1, perMonth: 10 } as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * DAY_MS;

/**
 * How an edit of a template in this status is applied: `meta` = Meta's edit (POST /{template id}),
 * `local` = only our row (never sent to Meta yet: the admin's submit sends it), absent = refused.
 */
const EDIT_ROUTE: Partial<Record<TemplateStatus, 'meta' | 'local'>> = {
  approved: 'meta',
  rejected: 'meta',
  paused: 'meta',
  not_submitted: 'local',
  missing: 'local',
};

export type EditRoute = 'meta' | 'local';

/** null = this status cannot be edited (pending: wait for Meta's review; disabled). */
export const editRoute = (status: TemplateStatus): EditRoute | null => EDIT_ROUTE[status] ?? null;

export type EditLimitReason = 'edit_daily_limit' | 'edit_monthly_limit';

export interface EditLimitInput {
  status: TemplateStatus;
  /** When it was edited on Meta while approved (message_templates.approved_edits). */
  edits: readonly string[];
  now: Date;
}

const within = (edits: readonly string[], now: Date, ms: number): string[] =>
  edits.filter((at) => now.getTime() - Date.parse(at) < ms);

const WINDOW: Record<EditLimitReason, { ms: number; limit: number }> = {
  edit_daily_limit: { ms: DAY_MS, limit: EDIT_LIMITS.perDay },
  edit_monthly_limit: { ms: MONTH_MS, limit: EDIT_LIMITS.perMonth },
};
const REASONS: readonly EditLimitReason[] = ['edit_daily_limit', 'edit_monthly_limit'];

/** Why Meta would refuse another edit now, or null. Only an approved template is counted. */
export function editLimitReason(input: EditLimitInput): EditLimitReason | null {
  if (input.status !== 'approved') return null;
  const full = (r: EditLimitReason) =>
    within(input.edits, input.now, WINDOW[r].ms).length >= WINDOW[r].limit;
  return REASONS.find(full) ?? null;
}

/** The edits still counted in the last 30 days (what the row keeps; older ones are dropped). */
export const recentEdits = (edits: readonly string[], now: Date): string[] =>
  within(edits, now, MONTH_MS);

/** When the next edit of an approved template is allowed (ISO), or null = now. */
export function nextEditAt(input: EditLimitInput): string | null {
  const reason = editLimitReason(input);
  if (!reason) return null;
  const { ms, limit } = WINDOW[reason];
  const counted = within(input.edits, input.now, ms).map((at) => Date.parse(at));
  counted.sort((a, b) => a - b);
  const opener = counted[counted.length - limit] ?? input.now.getTime();
  return new Date(opener + ms).toISOString();
}
