import { Button } from '@/components/ui/form/button';
import { controlClass } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';

export interface AyahStepperProps {
  /** «من الآية» / «إلى الآية»: the group's name and the number's label. */
  label: string;
  value: number;
  onChange: (value: number) => void;
}

/** − number +: one end of the ayah range (the picker clamps it to the surah). */
export function AyahStepper({ label, value, onChange }: AyahStepperProps) {
  const p = t.reports.v2.picker;
  const commit = (text: string) => {
    const n = Number(text);
    if (text.trim() !== '' && Number.isFinite(n) && n !== value) onChange(n);
  };
  return (
    <div role="group" aria-label={label} className="grid gap-1">
      <span className="text-xs text-ink-3">{label}</span>
      <div className="flex items-center gap-1.5">
        <Button type="button" variant="secondary" size="sm" aria-label={p.dec} onClick={() => onChange(value - 1)}>
          −
        </Button>
        {/* Typed digits apply on blur / Enter, so typing «25» never passes through «2» (the other end stays). */}
        <input
          key={value}
          type="number"
          inputMode="numeric"
          aria-label={label}
          defaultValue={value}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className={cn(controlClass, 'w-16 text-center tabular-nums')}
        />
        <Button type="button" variant="secondary" size="sm" aria-label={p.inc} onClick={() => onChange(value + 1)}>
          +
        </Button>
      </div>
    </div>
  );
}
