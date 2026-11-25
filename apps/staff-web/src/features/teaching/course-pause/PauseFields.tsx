import { coursePausePreviewText } from '@ab/client-core';
import type { CoursePausePreview } from '@ab/shared';
import { COURSE_PAUSE_REASON_MAX } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { coursePausePreviewQuery } from './api';
import { draftProblem, pauseLines, type PauseDraft } from './pause-form';

interface PauseFieldsProps {
  studentId: string;
  today: string;
  draft: PauseDraft;
  onChange: (patch: Partial<PauseDraft>) => void;
}

/** From (min today), until (optional, min from), reason, then the live preview line and the no-message note. */
export function PauseFields({ studentId, today, draft, onChange }: PauseFieldsProps) {
  const problem = draftProblem(draft, today);
  const words = t.coursePause;
  return (
    <div className="grid gap-4">
      <Field label={words.from} error={problem === 'date_in_past' ? words.errors.date_in_past : undefined}>
        {(p) => <Input {...p} type="date" dir="ltr" min={today} value={draft.from} onChange={(e) => onChange({ from: e.target.value })} />}
      </Field>
      <Field label={words.until} hint={words.untilHint} error={problem === 'invalid_range' ? words.errors.invalid_range : undefined}>
        {(p) => (
          <Input {...p} type="date" dir="ltr" min={draft.from || today} value={draft.until} onChange={(e) => onChange({ until: e.target.value })} />
        )}
      </Field>
      <Field label={words.reason} hint={words.reasonHint}>
        {(p) => (
          <Input
            {...p}
            value={draft.reason}
            maxLength={COURSE_PAUSE_REASON_MAX}
            onChange={(e) => onChange({ reason: e.target.value })}
          />
        )}
      </Field>
      {problem === null && (
        <PausePreviewLine studentId={studentId} from={draft.from} until={draft.until || null} />
      )}
      <p className="text-xs text-ink-3">{words.noMessage}</p>
    </div>
  );
}

interface PausePreviewLineProps {
  studentId: string;
  from: string;
  /** Null means until resumed. */
  until: string | null;
}

/** The answer's lines: the dates and the extension, else its one count line. */
const linesOf = (data: CoursePausePreview, tz: string): string[] =>
  data.starts
    ? pauseLines(data, tz)
    : [coursePausePreviewText(t.coursePause.preview, data.lessons)];

/** Re-read as the dates change, valid dates only. */
function PausePreviewLine({ studentId, from, until }: PausePreviewLineProps) {
  const tz = useViewerTz();
  const preview = useQuery(coursePausePreviewQuery({ studentId, from, until }));
  if (preview.isError) return null;
  const lines = preview.data ? linesOf(preview.data, tz) : [t.coursePause.previewLoading];
  return (
    <div aria-live="polite" aria-busy={preview.isFetching} className="grid gap-1 text-sm font-semibold text-ink">
      <p className="text-xs text-ink-3">{t.courseCard.whatHappens}</p>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
