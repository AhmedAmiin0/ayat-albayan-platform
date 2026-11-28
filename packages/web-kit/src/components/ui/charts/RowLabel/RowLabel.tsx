import type { RowLabelProps } from './RowLabel.types';
import { buttonClass, textClass } from './row-label.helpers';

export function RowLabel({ label, onSelect }: RowLabelProps) {
  return onSelect === undefined ? (
    <span title={label} className={textClass}>
      {label}
    </span>
  ) : (
    <button type="button" title={label} onClick={onSelect} className={buttonClass}>
      {label}
    </button>
  );
}
