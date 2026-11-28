import { cn } from '@ab/web-kit/lib/utils';
import type { RowLabelProps } from './RowLabel.types';

const textClass = 'min-w-0 truncate text-start text-sm text-ink';
const buttonClass = cn(
  textClass,
  'min-h-11 cursor-pointer rounded-sm underline decoration-rule-strong underline-offset-4',
  'hover:text-lapis focus-visible:outline-2 focus-visible:outline-offset-2',
  'focus-visible:outline-lapis',
);

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
