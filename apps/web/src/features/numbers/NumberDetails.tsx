import type { NumberView } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n';

const IDS = ['phone_number_id', 'waba_id', 'app_id'] as const;

/** «تفاصيل تقنية»: the raw Meta ids, folded so the card itself speaks Arabic (docs/23 §2d). */
export function NumberDetails({ view }: { view: NumberView }) {
  return (
    <details className="text-xs text-ink-3">
      <summary className="inline-flex min-h-11 cursor-pointer items-center sm:min-h-0">{t.numbers.technical}</summary>
      <dl className="mt-1 grid gap-1 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-4">
        {IDS.map((id) => (
          <div key={id} className="contents">
            <dt>{t.numbers.fields[id]}</dt>
            <dd className="break-all text-ink-2">{view[id] ? <Ltr className="whitespace-normal font-mono">{view[id]}</Ltr> : '—'}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
