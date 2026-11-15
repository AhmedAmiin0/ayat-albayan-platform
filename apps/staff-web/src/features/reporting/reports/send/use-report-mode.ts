import { isReadOnlyMode, reportFormMode, singleFlight, type SendGuard } from '@ab/client-core';
import type { ReportView } from '@ab/shared';
import { useState } from 'react';

/**
 * Where a report's form stands (owner 2026-11-06): read-only once sent, «تعديل التقرير» re-opens
 * the same report, and `guard` lets one send through at a time (a double tap or Enter while
 * the request is pending does nothing). `opened`: the form starts in an edit (the admin already
 * pressed «تعديل التقرير» on its read view).
 */
export function useReportMode(report: ReportView, opened = false) {
  const [editing, setEditing] = useState(opened);
  const [guard] = useState<SendGuard>(singleFlight);
  const mode = reportFormMode(report, editing);
  return {
    mode,
    locked: isReadOnlyMode(mode),
    guard,
    startEdit: () => setEditing(true),
    /** After a successful send: back to the read-only view of what was sent. */
    sent: () => setEditing(false),
  };
}

export type ReportMode = ReturnType<typeof useReportMode>;
