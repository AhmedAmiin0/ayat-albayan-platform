import type { DraftBody, ReportV2DraftBody, ReportV2SubmitBody, ReportView, SubmitBody } from '@ab/shared';
import { createContext, use } from 'react';
import { reportErrorText, saveDraft, saveDraftV2, submitReport, submitReportV2 } from './api';

type Call<B> = (input: { id: string; body: B }) => Promise<ReportView>;

/**
 * The calls one report form makes: the signed-in routes (/reports/:id/…) by default, or the ones
 * bound to a teacher's signed link (/public/teacher-report/:token/…), which has no session.
 */
export interface ReportApi {
  saveDraft: Call<DraftBody>;
  submitReport: Call<SubmitBody>;
  saveDraftV2: Call<ReportV2DraftBody>;
  submitReportV2: Call<ReportV2SubmitBody>;
  /** A failed call in the form's words. */
  errorText: (error: unknown) => string;
  /** Attachments need a session (signed Storage upload): hidden on the link. */
  attachments: boolean;
}

const SESSION_REPORT_API: ReportApi = {
  saveDraft,
  submitReport,
  saveDraftV2,
  submitReportV2,
  errorText: reportErrorText,
  attachments: true,
};

export const ReportApiContext = createContext<ReportApi>(SESSION_REPORT_API);

/** The report calls of the page around the form (the signed-in ones unless a link page says so). */
export function useReportApi(): ReportApi {
  return use(ReportApiContext);
}
