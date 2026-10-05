import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';

/** A search box over every setting (label, hint or key); an empty box shows everything. */
export function SettingsSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-ink-2">
        {t.config.search.label}
      </label>
      <Input id={id} type="search" value={value} placeholder={t.config.search.placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
