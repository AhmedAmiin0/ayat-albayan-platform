import { t } from '@ab/web-kit';

export type Scope = 'one' | 'rule';
const SCOPES: readonly Scope[] = ['one', 'rule'];

export interface ScopeRadiosProps {
  value: Scope;
  onChange: (scope: Scope) => void;
  /** A one-off lesson (no rule) can only be changed alone (API 400 no_rule). */
  ruleAllowed: boolean;
  label: string;
}

/** This lesson only, or it and every later one (R-SCH-07). */
export function ScopeRadios({ value, onChange, ruleAllowed, label }: ScopeRadiosProps) {
  return (
    <fieldset className="grid gap-1">
      <legend className="mb-1 text-xs font-semibold text-ink-2">{label}</legend>
      {SCOPES.map((scope) => (
        <label key={scope} className="flex min-h-11 items-center gap-2 text-sm sm:min-h-9">
          <input
            type="radio"
            name="lesson-scope"
            checked={value === scope}
            disabled={scope === 'rule' && !ruleAllowed}
            onChange={() => onChange(scope)}
            className="size-4 accent-[var(--lapis)]"
          />
          <span>{t.lessons.scope[scope]}</span>
        </label>
      ))}
    </fieldset>
  );
}
