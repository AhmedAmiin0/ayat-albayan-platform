import type { PortalFileKind } from '@ab/client-core';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { portalApi } from '@ab/web-kit/portal/api';
import { openAfter } from '@ab/web-kit/portal/open-file';

export interface PortalFile {
  kind: PortalFileKind;
  id: string;
}

const LABEL: Record<PortalFileKind, () => string> = {
  reports: () => t.portal.openPdf,
  recordings: () => t.portal.openRecording,
};

/**
 * A sent report's PDF or a visible recording: each opens by a signed link minted on the tap, into
 * a tab opened inside the tap (open-file.ts); a failure closes the tab and says so.
 */
export function FileButtons({ studentId, files }: { studentId: string; files: PortalFile[] }) {
  const open = useMutation({
    mutationFn: (file: PortalFile) =>
      openAfter(async () => (await portalApi.fileUrl({ studentId, ...file })).url),
  });
  if (files.length === 0) return null;
  return (
    <div className="grid gap-2">
      {open.isError && <FormAlert>{t.portal.fileFailed}</FormAlert>}
      <div className="flex flex-wrap gap-2">
        {files.map((file) => (
          <Button
            key={file.kind}
            type="button"
            variant="secondary"
            size="sm"
            disabled={open.isPending}
            onClick={() => open.mutate(file)}
          >
            {LABEL[file.kind]()}
          </Button>
        ))}
      </div>
    </div>
  );
}
