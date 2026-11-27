import { teacherLinkFileRoutes as routes } from '@ab/shared';
import { ApiError, publicCall } from '@ab/web-kit';
import { uploadSigned } from '@/lib/storage/upload-slot';
import type { AttachmentCalls } from '@/features/reporting/reports/report-api';

/**
 * The teacher's attachments on the no-login report page, bound to the link's token, never the
 * browser's session. The upload goes to the signed slot the API hands out (Supabase or MinIO by
 * its path, docs/45).
 */
export function linkFileCalls(token: string): AttachmentCalls {
  return {
    upload: async ({ id, file }) => {
      const meta = routes.uploadUrl.body.parse({ mime: file.type, size: file.size });
      const params = { token, id };
      const slot = await publicCall({ route: routes.uploadUrl, params, body: meta });
      const stored = await uploadSigned(slot, { body: file, contentType: file.type });
      if (stored.error) throw new ApiError(400, { code: 'attachment_path' });
      const body = { ...meta, path: slot.path };
      return publicCall({ route: routes.register, params, body });
    },
    remove: ({ id, attachmentId }) =>
      publicCall({ route: routes.remove, params: { token, id, attachmentId } }),
    url: ({ id, attachmentId }) =>
      publicCall({ route: routes.url, params: { token, id, attachmentId } }),
  };
}
