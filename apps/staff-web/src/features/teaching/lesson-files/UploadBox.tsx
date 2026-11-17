import { LESSON_FILE_KINDS, type LessonFileKind } from '@ab/shared';
import { pickProblem, type UploadProblem } from '@ab/client-core';
import { useState } from 'react';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import { useUploadFile } from './use-lesson-files';

const F = t.lessonFiles;

const PROBLEM: Record<UploadProblem, string> = {
  type: F.badType,
  too_large: F.tooLarge,
  failed: F.uploadFailed,
};

const isKind = (v: string): v is LessonFileKind => LESSON_FILE_KINDS.some((k) => k === v);

/** «أضف ملفًا للحلقة»: the kind, «يراه الطالب وولي الأمر», then <input type=file>. */
export function UploadBox({ lessonId }: { lessonId: string }) {
  const upload = useUploadFile();
  const [kind, setKind] = useState<LessonFileKind>('homework');
  const [visible, setVisible] = useState(true);
  const [problem, setProblem] = useState<UploadProblem | null>(null);
  const pick = (file: File | undefined): void => {
    if (!file) return;
    const refused = pickProblem({ mime: file.type, size: file.size });
    setProblem(refused);
    const picked = { name: file.name, mime: file.type, size: file.size, body: file };
    if (!refused) upload.mutate({ lessonId, kind, visible, file: picked }, { onError: () => setProblem('failed') });
  };
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
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="size-4 accent-[var(--lapis)]" />
        <span>{F.visible}</span>
      </label>
      <input
        type="file"
        aria-label={F.pickFile}
        accept="image/*,application/pdf,audio/*"
        disabled={upload.isPending}
        onChange={(e) => pick(e.target.files?.[0])}
        className="text-sm"
      />
      {upload.isPending && <p role="status" className="text-xs text-ink-3">{F.uploading}</p>}
      {upload.isSuccess && !problem && <p role="status" className="text-xs text-ok">{F.uploaded}</p>}
      {problem && <FormAlert>{PROBLEM[problem]}</FormAlert>}
    </div>
  );
}
