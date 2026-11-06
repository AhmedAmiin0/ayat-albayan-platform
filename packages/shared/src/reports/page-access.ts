import { z } from 'zod';
import { loginCode } from '../people/users/index.js';

// The report page's WhatsApp code (owner 2026-11-06): a viewer who is not signed in asks for a code
// sent to a phone ON FILE (the lesson's teacher or the student's family), never a typed number.

export const REPORT_CODE_TARGETS = ['teacher', 'family'] as const;
export type ReportCodeTarget = (typeof REPORT_CODE_TARGETS)[number];

/** POST /public/report-pages/:publicId/code */
export const reportCodeRequestSchema = z.object({ to: z.enum(REPORT_CODE_TARGETS) });
/** POST /public/report-pages/:publicId/verify */
export const reportCodeVerifySchema = z.object({ code: loginCode });

/** GET /public/report-pages/:publicId/access: where a code may go, each number masked. */
export const reportAccessViewSchema = z.object({
  /** false while codes cannot go out (no pepper, the template or the send gate). */
  available: z.boolean(),
  to: z.array(z.object({ to: z.enum(REPORT_CODE_TARGETS), masked: z.string() })),
});

export type ReportCodeRequest = z.infer<typeof reportCodeRequestSchema>;
export type ReportCodeVerify = z.output<typeof reportCodeVerifySchema>;
export type ReportAccessView = z.infer<typeof reportAccessViewSchema>;

// The teacher link's attachment answers (owner 2026-11-06), parsed by the page (rule 12).

/** POST …/attachments/upload-url: where to PUT the file (SignedUpload). */
export const signedUploadSchema = z.object({
  bucket: z.string(),
  path: z.string(),
  token: z.string(),
  signed_url: z.string(),
});

/** GET …/attachments/:id/url (SignedDownload). */
export const signedDownloadSchema = z.object({ url: z.url(), expires_at: z.string() });

/** POST …/attachments: the registered file (ReportAttachmentView). */
export const reportAttachmentViewSchema = z.object({
  id: z.string(),
  storage_path: z.string(),
  mime: z.string(),
  size: z.number(),
  created_at: z.string(),
});
