import type { NumberEvolutionView, NumberView } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { EvolutionQrDialog } from './EvolutionQrDialog';
import { EvolutionStateLine } from './EvolutionStateLine';
import { useEvolutionCheck } from './use-evolution';

const e = t.numbers.evolution;

export interface EvolutionStatusProps {
  view: NumberView;
  evolution: NumberEvolutionView;
  /** numbers.manage: the check and the QR call Evolution, so only managers see them. */
  manage: boolean;
}

/**
 * An Evolution number on its card (docs/19 «Evolution driver»): the engine, the last connection
 * state (by webhook, or the latest «افحص الاتصال»), and on Baileys «رمز QR» to link the phone.
 */
export function EvolutionStatus({ view, evolution, manage }: EvolutionStatusProps) {
  const [scanning, setScanning] = useState(false);
  const check = useEvolutionCheck(view.id);
  const last = check.answer ?? { state: evolution.state, checked_at: evolution.state_at };
  return (
    <section aria-label={e.stateLabel} className="grid gap-2">
      <p className="text-xs text-ink-2">
        <span className="text-ink-3">{e.modeLabel}: </span>
        {e.mode[evolution.mode]}
      </p>
      <EvolutionStateLine state={last.state} at={last.checked_at} />
      {manage && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" disabled={check.pending} onClick={check.check}>
            {check.pending ? e.checking : e.check}
          </Button>
          {evolution.mode === 'baileys' && (
            <Button size="sm" variant="secondary" onClick={() => setScanning(true)}>{e.qr}</Button>
          )}
        </div>
      )}
      <p role="status" aria-live="polite" className="text-xs font-semibold text-danger">
        {check.failed ? e.failed : ''}
      </p>
      {scanning && <EvolutionQrDialog view={view} onClose={() => setScanning(false)} />}
    </section>
  );
}
