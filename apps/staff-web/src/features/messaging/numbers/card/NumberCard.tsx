import type { NumberView } from '@ab/shared';
import { formatPhone } from '@ab/core';
import { Ltr, StatusChip, t } from '@ab/web-kit';
import { EvolutionStatus } from '@/features/messaging/numbers/evolution/EvolutionStatus';
import { FallbackRankField } from '@/features/messaging/numbers/form/FallbackRankField';
import { NumberActions } from './NumberActions';
import { NumberDetails } from './NumberDetails';
import { NumberHealthLine } from './NumberHealthLine';
import { NumberSecretRow } from '@/features/messaging/numbers/form/NumberSecretRow';
import { NumberTemplateSync } from './NumberTemplateSync';
import { secretsOf } from './number-secrets';

const n = t.numbers;

export function NumberCard({ view, manage }: { view: NumberView; manage: boolean }) {
  return (
    <article aria-label={view.label} data-number={view.id} className="grid min-w-0 gap-3 rounded-lg border border-rule bg-raised p-4">
      <header className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold">
            <bdi>{view.label}</bdi>
          </h3>
          <StatusChip
            size="sm"
            tone={view.enabled ? 'ok' : 'neutral'}
            glyph={view.enabled ? 'fill' : 'hollow'}
            label={view.enabled ? n.chips.enabled : n.chips.disabled}
          />
          {view.is_default && <StatusChip size="sm" tone="act" glyph="half" label={n.chips.default} />}
        </div>
        <p className="flex flex-wrap gap-x-2 text-xs text-ink-2">
          <span>{n.purpose[view.purpose]}</span>
          <span>· {n.provider[view.provider]}</span>
          {view.display_phone_e164 && (
            <span>
              · {n.chips.phone}: <Ltr>{formatPhone(view.display_phone_e164)}</Ltr>
            </span>
          )}
        </p>
        <NumberHealthLine view={view} />
      </header>
      {view.evolution && <EvolutionStatus view={view} evolution={view.evolution} manage={manage} />}
      <div className="grid">
        {secretsOf(view).map((name) => (
          <NumberSecretRow key={name} view={view} name={name} manage={manage} />
        ))}
      </div>
      <FallbackRankField key={`${view.id}:${view.fallback_rank}`} view={view} manage={manage} />
      <NumberTemplateSync view={view} />
      <NumberDetails view={view} />
      {manage && <NumberActions view={view} />}
    </article>
  );
}
