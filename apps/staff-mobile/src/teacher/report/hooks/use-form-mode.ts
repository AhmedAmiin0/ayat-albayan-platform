import {
  isReadOnlyMode,
  reportFormMode,
  singleFlight,
  type ReportFormMode,
  type SendGuard,
} from '@ab/client-core';
import type { ReportView } from '@ab/shared';
import { useState } from 'react';

interface FormMode {
  mode: ReportFormMode;
  /** The fields are shown, not editable (sent, or the edit window is over). */
  locked: boolean;
  /** One send at a time: a second tap while the request is pending does nothing. */
  guard: SendGuard;
  /** «تعديل التقرير»: the same report opens again for an edit. */
  startEdit: () => void;
  /** A send succeeded: back to the read-only view. */
  sent: () => void;
}

/** The phone's report form mode (owner 2026-11-06; the rules are client-core's reportFormMode). */
export function useFormMode(report: ReportView): FormMode {
  const [guard] = useState<SendGuard>(singleFlight);
  const [editing, setEditing] = useState(false);
  const mode = reportFormMode(report, editing);
  const startEdit = () => setEditing(true);
  const sent = () => setEditing(false);
  return { mode, locked: isReadOnlyMode(mode), guard, startEdit, sent };
}
