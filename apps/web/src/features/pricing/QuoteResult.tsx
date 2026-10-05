import { useId, type ReactNode } from 'react';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import type { QuoteResponse } from './api';
import { durationLabel, packageCopy, sessionsOf } from './format';
import { FxNote } from './FxNote';
import { Money } from './Money';
import { OfferActions } from './OfferActions';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-rule py-2 last:border-b-0">
      <dt className="text-ink-2">{label}</dt>
      <dd className="font-semibold text-ink">{children}</dd>
    </div>
  );
}

/** The featured (bulk) tier: «بدلاً من 420 ر.س» struck, and «وفّر 8%». Both numbers from the API. */
function Savings({ q }: { q: QuoteResponse }) {
  if (q.insteadOf === null || q.savingsPct === null) return null;
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-ink-3">
      <span>
        {t.pricing.insteadOf}{' '}
        <s>
          <Money amount={q.insteadOf} currency={q.currency} />
        </s>
      </span>
      <StatusChip tone="ok" size="sm" label={`${t.pricing.saveLabel} ${q.savingsPct}%`} />
    </p>
  );
}

export interface QuoteResultProps {
  quote: QuoteResponse;
  /** The quote belongs to the previous choice: the offer buttons are disabled. */
  stale: boolean;
}

/** One quote from GET /pricing/quote (docs/08 §3): nothing here is computed on the client. */
export function QuoteResult({ quote: q, stale }: QuoteResultProps) {
  const copy = packageCopy(q.package);
  const captionId = useId();
  return (
    <div className="grid content-start gap-4">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-ink">{copy.name}</h3>
          {q.popular && <StatusChip tone="neutral" size="sm" label={t.pricing.popularBadge} />}
          {q.featured && <StatusChip tone="neutral" size="sm" label={t.pricing.bulkBadge} />}
        </div>
        <p className="text-sm text-ink-2">{copy.tagline}</p>
        <p className="text-sm text-ink-2">
          {sessionsOf(q)} · {durationLabel(q.duration)} {t.pricing.perCircle}
        </p>
      </div>
      <figure
        aria-labelledby={captionId}
        className="grid gap-2 border-y border-rule py-3.5"
      >
        <figcaption id={captionId} className="text-xs font-semibold text-ink-3">
          {t.pricing.packagePrice}
        </figcaption>
        <p className="flex flex-wrap items-baseline gap-x-2 text-lg font-semibold text-ink">
          <Money
            amount={q.price}
            currency={q.currency}
            numberClassName="font-display text-[44px] font-bold leading-none"
          />
          {q.students > 1 && (
            <span className="text-xs font-medium text-ink-3">{t.pricing.perStudent}</span>
          )}
        </p>
        <Savings q={q} />
      </figure>
      <dl className="text-sm">
        <Row label={t.pricing.perCircleLabel}>
          <Money amount={q.perLesson} currency={q.currency} />
        </Row>
        <Row label={t.pricing.total}>
          <Money amount={q.total} currency={q.currency} />
        </Row>
        {q.discount > 0 && (
          <Row label={t.pricing.afterDiscount}>
            <Money amount={q.afterDiscount} currency={q.currency} />
          </Row>
        )}
      </dl>
      {q.fx && <FxNote fx={q.fx} />}
      <OfferActions quote={q} stale={stale} />
      <p className="text-xs text-ink-3 text-pretty">{t.pricing.trialNote}</p>
    </div>
  );
}
