import { useId } from 'react';
import { t } from '@ab/web-kit';

const E = t.peopleEdit;

export interface SelfToggleProps {
  on: boolean;
  /** Another child of the family already holds the number. */
  locked: boolean;
  busy: boolean;
  onToggle: (value: boolean) => void;
}

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
