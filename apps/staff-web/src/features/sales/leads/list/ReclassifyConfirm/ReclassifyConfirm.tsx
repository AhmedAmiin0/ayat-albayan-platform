import { Button, Icon, NuqtaGlyph, t } from '@ab/web-kit';
import { stripClass } from './reclassify-confirm.classes';
import type { ReclassifyConfirmProps } from './ReclassifyConfirm.types';
import { escapeKeeps, focusOnMount } from './reclassify-keys';

/** Inline confirm (docs/07 §9, R-LEAD-04); focus goes to the safe choice, Esc keeps the lead. */
export function ReclassifyConfirm({ busy, onKeep, onMove }: ReclassifyConfirmProps) {
  const onKeyDown = escapeKeeps(onKeep);
  return (
    <div role="group" aria-label={t.leads.reclassifyAsApplicant} className={stripClass}>
      <span className="font-semibold text-ink">
        <NuqtaGlyph
          shape="fill"
          className="me-1.5 inline-block size-[9px] align-baseline text-act"
        />
        {t.leads.looksLikeApplicant}
      </span>
      <span>{t.leads.reclassifyConfirm}</span>
      <div className="flex w-full gap-2 sm:ms-auto sm:w-auto">
        <Button
          ref={focusOnMount}
          variant="ghost"
          size="sm"
          className="max-sm:flex-1"
          onClick={onKeep}
          onKeyDown={onKeyDown}
        >
          {t.leads.keepHere}
        </Button>
        <Button
          size="sm"
          className="max-sm:flex-1"
          disabled={busy}
          onClick={onMove}
          onKeyDown={onKeyDown}
        >
          <Icon name="brief" />
          {busy ? t.common.saving : t.leads.reclassifyAsApplicant}
        </Button>
      </div>
    </div>
  );
}
