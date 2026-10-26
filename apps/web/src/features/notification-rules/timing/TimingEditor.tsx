import { DAY_BEFORE_HOURS } from '@ab/shared';
import { useId } from 'react';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import { RuleCheck } from '../table/RuleCheck';
import type { TimingDraft } from '../rule-timing';
import { CountInput } from './CountInput';
import { FollowUpEditor } from './FollowUpEditor';

const tm = t.notificationRules.timing;
const MINUTES = { min: 5, max: 720 };

export interface TimingEditorProps {
  draft: TimingDraft;
  onChange: (draft: TimingDraft) => void;
  disabled: boolean;
  /** The first problem of the draft, in words (linked by aria-describedby). */
  error: string | null;
}

function Fields({ draft, onChange, disabled, describedBy, invalid }: Omit<TimingEditorProps, 'error'> & { describedBy: string; invalid: boolean }) {
  const selectId = useId();
  const common = { disabled, describedBy, invalid };
  if (draft.kind === 'lesson_reminder') {
    return <CountInput label={tm.minutesLabel} unit={tm.minutesUnit} value={draft.minutes} bounds={MINUTES} onChange={(minutes) => onChange({ ...draft, minutes })} {...common} />;
  }
  if (draft.kind === 'teacher_lesson_reminder') {
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <RuleCheck label={tm.sameAsFamily} checked={draft.same} disabled={disabled} onChange={(same) => onChange({ ...draft, same })} />
        {!draft.same && (
          <CountInput label={tm.minutesLabel} unit={tm.minutesUnit} value={draft.minutes} bounds={MINUTES} onChange={(minutes) => onChange({ ...draft, minutes })} {...common} />
        )}
      </span>
    );
  }
  if (draft.kind === 'lesson_reminder_24h') {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <label htmlFor={selectId} className="text-xs text-ink-2">
          {tm.dayBeforeLabel}
        </label>
        <Select id={selectId} value={draft.at} disabled={disabled} aria-describedby={describedBy} onChange={(e) => onChange({ ...draft, at: e.target.value })} className="w-auto">
          <option value="">{tm.dayBeforeSame}</option>
          {DAY_BEFORE_HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </Select>
        <span className="text-xs text-ink-3">{tm.dayBeforeZone}</span>
      </span>
    );
  }
  return <FollowUpEditor draft={draft} onChange={onChange} {...common} />;
}

const BOUNDS: Record<TimingDraft['kind'], string | null> = {
  lesson_reminder: tm.minutesBounds,
  teacher_lesson_reminder: tm.minutesBounds,
  lesson_reminder_24h: null,
  follow_up_slots: `${tm.followUpBounds} · ${tm.slotsBounds}`,
};

/** A row's timing editor: selects and bounded numbers only, the bounds and the first problem under it. */
export function TimingEditor({ draft, onChange, disabled, error }: TimingEditorProps) {
  const boundsId = useId();
  const errorId = useId();
  const bounds = BOUNDS[draft.kind];
  const describedBy = [bounds && boundsId, error && errorId].filter(Boolean).join(' ');
  return (
    <span className="grid gap-1">
      <Fields draft={draft} onChange={onChange} disabled={disabled} describedBy={describedBy} invalid={error !== null} />
      {bounds && (
        <small id={boundsId} className="text-2xs text-ink-3">
          {bounds}
        </small>
      )}
      <span aria-live="polite">
        {error && (
          <span id={errorId} className="flex items-center gap-1.5 text-xs text-danger">
            <NuqtaGlyph shape="struck" />
            <span>{error}</span>
          </span>
        )}
      </span>
    </span>
  );
}
