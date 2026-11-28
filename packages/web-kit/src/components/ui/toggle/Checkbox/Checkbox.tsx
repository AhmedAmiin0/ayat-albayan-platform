import type { CheckboxProps } from './Checkbox.types';
import { useCheckbox } from './use-checkbox';
import { labelClass, boxClass } from './checkbox.helpers';

/** A native checkbox with its label: keyboard, focus ring and form behaviour stay the browser's. */
export function Checkbox({ label, checked, onCheckedChange, hint, disabled, id }: CheckboxProps) {
  const { hintId } = useCheckbox();
  return (
    <label className={labelClass}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-describedby={hint === undefined ? undefined : hintId}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className={boxClass}
      />
      <span className="grid gap-0.5">
        <span>{label}</span>
        {hint !== undefined && (
          <span id={hintId} className="text-xs text-ink-3">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}
