import { useId } from 'react';
import { t } from '@/lib/i18n/i18n';

const E = t.peopleEdit;

export interface SelfToggleProps {
  on: boolean;
  /** Another child of the family already holds the number. */
  locked: boolean;
  busy: boolean;
  onToggle: (value: boolean) => void;
}

/** «الطالب هو ولي الأمر» (students.contact_is_self), with why it may be locked. */
export function SelfToggle({ on, locked, busy, onToggle }: SelfToggleProps) {
  const hintId = useId();
  return (
    <div className="grid gap-1">
      <label className="flex items-center gap-2 font-semibold">
        <input
          type="checkbox"
          aria-describedby={hintId}
          checked={on}
          disabled={busy || locked}
          onChange={(e) => onToggle(e.target.checked)}
        />
        {E.selfToggle}
      </label>
      <span id={hintId} className="text-sm text-ink-3">
        {locked ? E.selfTaken : E.selfHint}
      </span>
    </div>
  );
}
