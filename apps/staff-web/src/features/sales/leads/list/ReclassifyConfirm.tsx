import { useEffect, useRef } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { NuqtaGlyph } from '@ab/web-kit/components/ui/display/nuqta-glyph';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export interface ReclassifyConfirmProps {
  /** The move request is in flight. */
  busy: boolean;
  onKeep: () => void;
  onMove: () => void;
}

/** Inline confirm (docs/07 §9, R-LEAD-04); focus goes to the safe choice, Esc keeps the lead. */
export function ReclassifyConfirm({ busy, onKeep, onMove }: ReclassifyConfirmProps) {
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => keep.current?.focus(), []);

  return (
    <div
      role="group"
      aria-label={t.leads.reclassifyAsApplicant}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        onKeep();
      }}
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
