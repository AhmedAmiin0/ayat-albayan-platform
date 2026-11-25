import { t } from '@ab/web-kit';

const F = t.lessonFiles;

interface Props {
  checked: boolean;
  disabled: boolean;
  onChange: (visible: boolean) => void;
}

/** The label never changes; the hidden note shows under it when off. */
export function VisibleBox({ checked, disabled, onChange }: Props) {
  return (
    <div className="grid">
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 accent-[var(--lapis)]"
        />
        <span>{F.visible}</span>
      </label>
      {!checked && <p className="text-xs text-ink-3">{F.hidden}</p>}
    </div>
  );
}
