import { SwitchTrack, switchInputClass } from '@/components/settings/fields/SwitchTrack';
import { onOff } from '../lib/value-format';

export interface ValueSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** The row label's id (the switch is named by the row label). */
  labelledBy?: string;
  /** Or its own name (the ON/OFF switch of a number that can be off). */
  label?: string;
  disabled?: boolean;
}

/**
 * A checkbox with role=switch drawn as a track and knob (the settings pages' switch), with its
 * state word («مفعّل» / «مغلق»). Phones: the hit area is 44px tall; from 640px the track's own.
 */
export function ValueSwitch({ checked, onChange, labelledBy, label, disabled }: ValueSwitchProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span data-switch-hit className="relative inline-flex min-h-11 items-center sm:min-h-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-labelledby={label ? undefined : labelledBy}
          aria-label={label}
          onChange={(e) => onChange(e.target.checked)}
          className={switchInputClass}
        />
        <SwitchTrack />
      </span>
      <span aria-hidden="true" className="text-xs text-ink-2">
        {onOff(checked)}
      </span>
    </span>
  );
}
