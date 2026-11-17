import type { LessonFileView } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { fileLine, fileTitle } from './file-words';
import { useFileVisibility, useOpenFile, useRemoveFile } from './use-lesson-files';

const F = t.lessonFiles;

/** One file staff added: its name and size, «يراه الطالب وولي الأمر», open and remove. */
export function LessonFileItem({ file }: { file: LessonFileView }) {
  const visible = useFileVisibility();
  const open = useOpenFile();
  const remove = useRemoveFile();
  const failed = visible.isError || open.isError || remove.isError;
  return (
    <li className="grid gap-1 border-b border-rule py-2 last:border-b-0">
      <p className="text-sm font-semibold">{fileTitle(file)}</p>
      <p className="text-xs text-ink-3">{fileLine(file)}</p>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={file.visible_to_family}
          disabled={visible.isPending}
          onChange={(e) => visible.mutate({ id: file.id, visible: e.target.checked })}
          className="size-4 accent-[var(--lapis)]"
        />
        <span>{file.visible_to_family ? F.visible : F.hidden}</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => open.mutate(file.id)}>
          {F.open}
        </Button>
        <Button
          type="button"
          variant="danger-quiet"
          size="sm"
          disabled={remove.isPending}
          onClick={() => remove.mutate(file.id)}
        >
          {F.remove}
        </Button>
      </div>
      {failed && <FormAlert>{remove.isError ? F.removeFailed : F.fileFailed}</FormAlert>}
    </li>
  );
}
