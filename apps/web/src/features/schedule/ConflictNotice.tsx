import { lessonWhenText, type Conflict } from '@ab/shared';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { tzCity } from '@/components/ui/time-zone-select';
import { t } from '@/lib/i18n';
import { RIYADH_TZ } from './tz';

/** How many clashes are listed before «وفيه {n} تعارض كمان». */
const SHOWN = 5;

/** «المعلم/ة مشغول/ة بحلقة تانية في الميعاد ده (الأحد 4 أكتوبر 17:00)», Riyadh wall clock. */
export function conflictText(c: Conflict): string {
  return t.booking.conflict[c.kind].replace('{when}', lessonWhenText(new Date(c.startsAt), RIYADH_TZ));
}

export interface ConflictNoticeProps {
  conflicts: readonly Conflict[];
  /** «اختار ميعاد تاني»: back to the slot grid. */
  onChangeSlot: () => void;
  /** «احجز رغم التعارض» with the reason (R-SCH-04); stored on the clashing lessons. */
  onOverride: (reason: string) => void;
  busy?: boolean;
}

/**
 * 409 `conflict` (R-SCH-04, issue B3): every clash in Arabic, then the two ways out: pick another
 * slot, or book anyway with a reason. The reason is required (the API rejects a blank one).
 */
export function ConflictNotice({ conflicts, onChangeSlot, onOverride, busy = false }: ConflictNoticeProps) {
  const titleId = useId();
  const [reason, setReason] = useState('');
  const [missing, setMissing] = useState(false);
  const more = conflicts.length - SHOWN;
  const submit = () => {
    if (reason.trim()) onOverride(reason.trim());
    else setMissing(true);
  };

  return (
    <section
      aria-labelledby={titleId}
      className="grid gap-3 rounded-md bg-danger-soft px-4 py-3.5 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cinnabar)_35%,transparent)]"
    >
      <h3 id={titleId} role="alert" className="flex items-center gap-2 font-semibold">
        <NuqtaGlyph shape="struck" className="text-danger" />
        <span>{t.booking.conflictTitle}</span>
      </h3>
      <p className="text-xs text-ink-2">{t.booking.tzNote.replace('{city}', tzCity(RIYADH_TZ) ?? RIYADH_TZ)}</p>
      <ul className="grid gap-1.5 text-sm">
        {conflicts.slice(0, SHOWN).map((c, i) => (
          <li key={`${c.kind}-${c.startsAt}-${i}`} className="flex items-start gap-2">
            <NuqtaGlyph shape="hollow" className="mt-1.5 text-danger" />
            <span>{conflictText(c)}</span>
          </li>
        ))}
      </ul>
      {more > 0 && <p className="text-xs text-ink-2">{t.booking.conflictMore.replace('{n}', String(more))}</p>}
      <div className="grid gap-3 border-t border-rule pt-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field
          label={t.booking.overrideReason}
          hint={t.booking.overrideHint}
          error={missing ? t.common.required : undefined}
        >
          {(p) => (
            <Input
              {...p}
              value={reason}
              placeholder={t.lessons.reasonHint}
              onChange={(e) => {
                setReason(e.target.value);
                setMissing(false);
              }}
            />
          )}
        </Field>
        <div className="flex flex-wrap gap-2.5 sm:pb-6">
          <Button type="button" variant="ghost" onClick={onChangeSlot}>
            {t.booking.changeSlot}
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={submit}>
            {t.booking.override}
          </Button>
        </div>
      </div>
    </section>
  );
}
