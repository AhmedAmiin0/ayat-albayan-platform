import type { DraftPorts } from '@ab/client-core';
import type { ReportFormResponse, ReportView } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { pathKey } from '@ab/mobile-kit';
import { withReport } from '@/teacher/report/hooks/api';
import { dropIfRefused, dropStoredDraft, keepStoredDraft } from './draft-storage';
import { subscribeResume } from './resume';

const store = { keep: keepStoredDraft, drop: dropStoredDraft, dropIfRefused };
const FORMS_KEY = [...pathKey('/reports'), 'form'];

/** The phone keeps each unsent body and puts every saved copy into the open form's cache. */
export function useDraftPorts(): DraftPorts<ReportView> {
  const client = useQueryClient();
  const onSaved = (view: ReportView) =>
    client.setQueriesData<ReportFormResponse>({ queryKey: FORMS_KEY }, (old) =>
      withReport(old, view),
    );
  return { store, onSaved, subscribeResume };
}
