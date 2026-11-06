import type {
  DraftBody,
  ReportAttachmentView,
  ReportV2DraftBody,
  ReportV2SubmitBody,
  ReportView,
  SignedDownload,
  SubmitBody,
} from '@ab/shared';
import { createContext, use } from 'react';
import {
  attachmentUrl,
  removeAttachment,
  reportErrorText,
  saveDraft,
  saveDraftV2,
  submitReport,
  submitReportV2,
  uploadAttachment,
} from './api';

type Call<B> = (input: { id: string; body: B }) => Promise<ReportView>;
interface FileRef {
  id: string;
  attachmentId: string;
}

/** A report's attachments: signed Storage upload, then registered; remove; open (signed URL). */
export interface AttachmentCalls {
  upload: (input: { id: string; file: File }) => Promise<ReportAttachmentView>;
  remove: (input: FileRef) => Promise<unknown>;
  url: (input: FileRef) => Promise<SignedDownload>;
}

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
  /** Whether the form shows «المرفقات» (the link too since 2026-11-06). */
  attachments: boolean;
  files: AttachmentCalls;
}

const SESSION_REPORT_API: ReportApi = {
  saveDraft,
  submitReport,
  saveDraftV2,
  submitReportV2,
  errorText: reportErrorText,
  attachments: true,
  files: { upload: uploadAttachment, remove: removeAttachment, url: attachmentUrl },
};

export const ReportApiContext = createContext<ReportApi>(SESSION_REPORT_API);

/** The report calls of the page around the form (the signed-in ones unless a link page says so). */
export function useReportApi(): ReportApi {
  return use(ReportApiContext);
}
