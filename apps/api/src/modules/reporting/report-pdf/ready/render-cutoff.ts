const MINUTE = 60_000;
/**
 * docs/46 B3: once the window has closed, a minute more before the render, so an edit that passed
 * the gate just before the close has committed when the PDF job reads the report.
 */
export const SEND_GRACE_MS = 60_000;
/**
 * report_teacher_edit_minutes = 0 (no window, sent at once): a few minutes of slack the other way,
 * so a database clock slightly ahead of the API's never holds a fresh submit for the next poll.
 */
export const CLOCK_SLACK_MS = 5 * MINUTE;

const hasWindow = (minutes: number): boolean => minutes > 0;

/**
 * docs/46 D5: the newest FIRST submit (lesson_reports.submitted_at) the PDF job may render and send
 * now. A report is rendered once its teacher's window (first submit + minutes, never extended by
 * an edit) has closed, plus the grace; an older report (an admin edit after the send) at once.
 */
export function renderCutoff(now: Date, minutes: number): Date {
  const shift = hasWindow(minutes) ? -SEND_GRACE_MS : CLOCK_SLACK_MS;
  return new Date(now.getTime() - minutes * MINUTE + shift);
}
