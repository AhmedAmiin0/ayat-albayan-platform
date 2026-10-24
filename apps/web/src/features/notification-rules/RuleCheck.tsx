export interface RuleCheckProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** A fuller name for assistive tech when the visible label is short («واتساب: تذكير الحلقة»). */
  ariaLabel?: string;
}

/** A checkbox whose whole label toggles it: 44px on phones, compact from 640px. */
export function RuleCheck({ label, checked, onChange, disabled, ariaLabel }: RuleCheckProps) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-xs text-ink-2 sm:min-h-7">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 shrink-0 accent-[var(--lapis)]"
      />
      <span>{label}</span>
    </label>
  );
}
