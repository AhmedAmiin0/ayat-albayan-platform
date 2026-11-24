import type { LessonFileView } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { ConfirmDialog } from '@/features/finance/payments';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { fileLine, fileTitle } from '@ab/web-kit/lesson-files/file-words';
import { useFileVisibility, useOpenFile, useRemoveFile } from './use-lesson-files';
import { VisibleBox } from './VisibleBox';

const F = t.lessonFiles;

/** Removal asks first. */
export function LessonFileItem({ file }: { file: LessonFileView }) {
  const visible = useFileVisibility();
  const open = useOpenFile();
  const remove = useRemoveFile();
  const [asking, setAsking] = useState(false);
  return (
    <li className="grid gap-1 border-b border-rule py-2 last:border-b-0">
      <p className="text-sm font-semibold">{fileTitle(file)}</p>
      <p className="text-xs text-ink-3">{fileLine(file)}</p>
      <VisibleBox
        checked={file.visible_to_family}
        disabled={visible.isPending}
        onChange={(on) => visible.mutate({ id: file.id, visible: on })}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => open.mutate(file.id)}>
          {F.open}
        </Button>
        <Button type="button" variant="danger-quiet" size="sm" onClick={() => setAsking(true)}>
          {F.remove}
        </Button>
      </div>
      {(visible.isError || open.isError) && <FormAlert>{F.fileFailed}</FormAlert>}
      {asking && (
        <ConfirmDialog
          title={F.removeConfirm}
          confirmLabel={F.remove}
          pending={remove.isPending}
          error={remove.isError ? F.removeFailed : null}
          onConfirm={() => remove.mutate(file.id, { onSuccess: () => setAsking(false) })}
          onClose={() => setAsking(false)}
        >
          <p className="text-sm text-ink-2">{F.removeConfirmBody}</p>
        </ConfirmDialog>
      )}
    </li>
  );
}
