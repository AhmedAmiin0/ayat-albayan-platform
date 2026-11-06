import { reportAttachmentViewSchema, signedDownloadSchema, signedUploadSchema } from '@ab/shared';
import { ApiError, publicApiFetch, publicApiSend } from '@/lib/http/api';
import { supabase } from '@/lib/http/supabase';
import type { AttachmentCalls } from '@/features/reporting/reports/report-api';

/**
 * The teacher's attachments on the no-login report page (owner 2026-11-06), bound to the link:
 * /public/teacher-report/:token/reports/:id/attachments/…, never the browser's session. The upload
 * goes to the signed Storage URL the API hands out (its token is the only credential).
 */
export function linkFileCalls(linkBase: string): AttachmentCalls {
  const at = (id: string) => `${linkBase}/reports/${id}/attachments`;
  return {
    upload: async ({ id, file }) => {
      const meta = { mime: file.type, size: file.size };
      const slot = signedUploadSchema.parse(await publicApiSend('POST', `${at(id)}/upload-url`, meta));
      const stored = await supabase.storage
        .from(slot.bucket)
        .uploadToSignedUrl(slot.path, slot.token, file);
      if (stored.error) throw new ApiError(400, { code: 'attachment_path' });
      const body = { ...meta, path: slot.path };
      return reportAttachmentViewSchema.parse(await publicApiSend('POST', at(id), body));
    },
    remove: ({ id, attachmentId }) => publicApiSend('DELETE', `${at(id)}/${attachmentId}`),
    url: async ({ id, attachmentId }) =>
      signedDownloadSchema.parse(await publicApiFetch(`${at(id)}/${attachmentId}/url`)),
  };
}
