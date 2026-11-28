import type { SwitchProps } from './Switch.types';
import { inputClass, hitClass, trackClass, knobClass } from './switch.helpers';

/**
 * An on/off control: a real checkbox with role=switch laid invisibly over a drawn track, so it
 * keeps the native keyboard and form behaviour. The hit area is 44 px at every width.
 */
export function Switch(props: SwitchProps) {
  const { checked, onCheckedChange, words, label, labelledBy, disabled, id } = props;
  return (
    <span className="inline-flex items-center gap-2">
      <span data-switch-hit className={hitClass}>
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          aria-checked={checked}
          disabled={disabled}
          aria-label={label}
          aria-labelledby={label === undefined ? labelledBy : undefined}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className={inputClass}
        />
        <span aria-hidden="true" className={trackClass} />
        <span aria-hidden="true" data-switch-knob className={knobClass} />
      </span>
      <span aria-hidden="true" className="text-xs text-ink-2">
        {checked ? words.on : words.off}
      </span>
    </span>
  );
}
