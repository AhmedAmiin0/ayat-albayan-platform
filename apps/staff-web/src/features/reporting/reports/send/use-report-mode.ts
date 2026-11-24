import { isReadOnlyMode, reportFormMode, singleFlight, type SendGuard } from '@ab/client-core';
import type { ReportView } from '@ab/shared';
import { useState } from 'react';

/** Read-only once sent, edit re-opens the same report; `guard` lets one send through at a time. */
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
