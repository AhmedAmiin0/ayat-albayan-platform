import type { NumberView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { NumberCard } from './card/NumberCard';

export interface NumbersListProps {
  numbers: readonly NumberView[] | undefined;
  failed: boolean;
  manage: boolean;
}

/** The cards, «لا توجد أرقام بعد» when none, or the load error. */
export function NumbersList({ numbers, failed, manage }: NumbersListProps) {
  if (failed) return <p className="text-sm text-ink-2">{t.numbers.loadError}</p>;
  if (!numbers) return null;
  if (numbers.length === 0) return <p className="text-sm text-ink-2">{t.numbers.empty}</p>;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {numbers.map((v) => (
        <NumberCard key={v.id} view={v} manage={manage} />
      ))}
    </div>
  );
}
