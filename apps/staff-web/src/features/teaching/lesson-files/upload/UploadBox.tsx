import { LESSON_FILE_KINDS, type LessonFileKind } from '@ab/shared';
import { useState } from 'react';
import { Button, Select, t } from '@ab/web-kit';
import { UploadQueue } from './UploadQueue';
import { useUploadQueue } from './use-upload-queue';

const F = t.lessonFiles;

const isKind = (v: string): v is LessonFileKind => LESSON_FILE_KINDS.some((k) => k === v);

/** Cancel drops the files still waiting. */
export function UploadBox({ lessonId }: { lessonId: string }) {
  const [kind, setKind] = useState<LessonFileKind>('homework');
  const [visible, setVisible] = useState(true);
  const queue = useUploadQueue({ lessonId, kind, visible });
  return (
    <div className="grid gap-2 rounded-md border border-dashed border-rule-strong p-3">
      <p className="text-sm font-semibold">{F.add}</p>
      <p className="text-xs text-ink-3">{F.hint}</p>
      <label className="grid gap-1 text-xs">
        <span>{F.kind}</span>
        <Select value={kind} onChange={(e) => isKind(e.target.value) && setKind(e.target.value)}>
          {LESSON_FILE_KINDS.map((k) => <option key={k} value={k}>{F.kinds[k]}</option>)}
        </Select>
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
          className="size-4 accent-[var(--lapis)]"
        />
        <span>{F.visible}</span>
      </label>
      <input
        type="file"
        multiple
        aria-label={F.pickFile}
        accept="image/*,application/pdf,audio/*"
        disabled={queue.busy}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          void queue.pick(files);
        }}
        className="text-sm"
      />
      <UploadQueue items={queue.items} />
      {queue.busy && (
        <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={queue.cancel}>
          {t.common.cancel}
        </Button>
      )}
    </div>
  );
}
