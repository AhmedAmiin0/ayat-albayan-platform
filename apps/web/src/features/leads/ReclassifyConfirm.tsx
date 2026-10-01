import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';

export interface ReclassifyConfirmProps {
  /** The move request is in flight. */
  busy: boolean;
  onKeep: () => void;
  onMove: () => void;
}

/**
 * Inline confirm strip under an inbox row (docs/07 §9, R-LEAD-04): «سيبها هنا» (ghost) or
 * «نقل لطلبات التوظيف» (the screen's one primary). Focus moves to the safe choice on open.
 */
export function ReclassifyConfirm({ busy, onKeep, onMove }: ReclassifyConfirmProps) {
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => keep.current?.focus(), []);

  return (
    <div
      role="group"
      aria-label={t.leads.reclassifyAsApplicant}
      className="col-span-full mt-2.5 flex sm:col-[2/-1] flex-wrap items-center gap-x-3.5 gap-y-2 rounded-md border border-gold-soft bg-page px-3 py-2.5 text-xs text-ink-2"
    >
      <span className="font-semibold text-ink">
        <NuqtaGlyph shape="fill" className="me-1.5 inline-block size-[9px] align-baseline text-act" />
        {t.leads.looksLikeApplicant}
      </span>
      <span>{t.leads.reclassifyConfirm}</span>
      <div className="flex w-full gap-2 sm:ms-auto sm:w-auto">
        <Button ref={keep} variant="ghost" size="sm" className="max-sm:flex-1" onClick={onKeep}>
          {t.leads.keepHere}
        </Button>
        <Button size="sm" className="max-sm:flex-1" disabled={busy} onClick={onMove}>
          <Icon name="brief" />
          {busy ? t.common.saving : t.leads.reclassifyAsApplicant}
        </Button>
      </div>
    </div>
  );
}
