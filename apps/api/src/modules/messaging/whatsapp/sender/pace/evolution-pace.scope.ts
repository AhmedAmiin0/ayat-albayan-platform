import type { WaLine } from '@ab/shared';

// Which queued rows to one recipient leave from ONE Evolution number (docs/19 «Evolution driver»,
// final review 1): the rows stamped with it, and, only when it is its line's default, the session
// texts of that line not stamped yet (routeSession sends those from the default). A template row
// (renewal, reminders) or a row of another line or number is never in scope: it routes elsewhere.

/** One recipient on one Evolution number. */
export interface RecipientScope {
  numberId: string;
  phone: string;
  /** The line whose unstamped session texts default to this number; null = it is no default. */
  defaultLine: WaLine | null;
}

/** PostgREST: the row's line (a session text with no line leaves as notifications). */
const lineCond = (line: WaLine): string =>
  line === 'notifications' ? 'or(line.is.null,line.eq.notifications)' : `line.eq.${line}`;

/** PostgREST `or` members for the rows in scope, each AND-ed with `extra` (may be empty). */
export function scopeFilter(scope: RecipientScope, extra: string[] = []): string {
  const all = (conds: string[]): string => `and(${[...conds, ...extra].join(',')})`;
  const { defaultLine } = scope;
  const unstamped = defaultLine
    ? [all(['number_id.is.null', 'template_key.is.null', lineCond(defaultLine)])]
    : [];
  return [all([`number_id.eq.${scope.numberId}`]), ...unstamped].join(',');
}
