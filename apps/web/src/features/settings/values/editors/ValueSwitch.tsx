import { onOff } from '../value-format';

export interface ValueSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** The row label's id (the switch is named by the row label). */
  labelledBy?: string;
  /** Or its own name (the ON/OFF switch of a number that can be off). */
  label?: string;
  disabled?: boolean;
}

/** A checkbox with role=switch drawn as a track and knob, with its state word («مفعّل» / «مغلق»). */
export function ValueSwitch({ checked, onChange, labelledBy, label, disabled }: ValueSwitchProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative inline-flex">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-labelledby={label ? undefined : labelledBy}
          aria-label={label}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <span
          aria-hidden="true"
          className="block h-6 w-11 rounded-full border border-rule-input bg-sunk transition-colors duration-150 peer-checked:border-lapis-fill peer-checked:bg-lapis-fill peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lapis peer-disabled:opacity-45"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute start-[3px] top-[3px] size-[18px] rounded-full bg-ink-3 transition-transform duration-150 peer-checked:bg-white rtl:peer-checked:-translate-x-5 ltr:peer-checked:translate-x-5"
        />
      </span>
      <span aria-hidden="true" className="text-xs text-ink-2">
        {onOff(checked)}
      </span>
    </span>
  );
}
