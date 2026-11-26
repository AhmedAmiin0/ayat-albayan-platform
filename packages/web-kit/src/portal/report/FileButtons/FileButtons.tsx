import type { PortalFileKind } from '@ab/client-core';
import { useMutation } from '@tanstack/react-query';
import { Icon, type IconName } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
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

/** The report page's buttons carry what they do (board FamRecWebReport): save, or a new tab. */
const ICON: Record<PortalFileKind, IconName> = { reports: 'download', recordings: 'external' };

interface Props {
  studentId: string;
  files: PortalFile[];
  /** Each button with its icon (the report page); bare words in a file list. */
  icons?: boolean;
}

/**
 * A sent report's PDF or a visible recording: each opens by a signed link minted on the tap, into
 * a tab opened inside the tap (open-file.ts); a failure closes the tab and says so.
 */
export function FileButtons({ studentId, files, icons = false }: Props) {
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
            {icons && <Icon name={ICON[file.kind]} />}
            {LABEL[file.kind]()}
          </Button>
        ))}
      </div>
    </div>
  );
}
