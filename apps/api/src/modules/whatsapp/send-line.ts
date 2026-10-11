import type { WaLine } from '@ab/shared';
import type { DueMessage } from './sender.due';

/**
 * The line a queued row leaves from (docs/12 §13.3): a template ALWAYS from notifications (its
 * WABA holds the templates); a session text from the line it was stamped with at enqueue.
 */
export function lineOf(row: Pick<DueMessage, 'template_key' | 'line'>): WaLine {
  return row.template_key ? 'notifications' : (row.line ?? 'notifications');
}
