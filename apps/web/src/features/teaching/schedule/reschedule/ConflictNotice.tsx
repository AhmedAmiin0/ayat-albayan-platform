import { clockOf, type Conflict, lessonWhenAt, sameClockAt } from '@ab/shared';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { ButtonRow } from '@/components/ui/layout/button-row';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { tzCity } from '@/components/ui/form/time-zone-select';
import { t } from '@/lib/i18n/i18n';
import { type Clock, useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';
import { revealOnMount } from '@/lib/dom/mount-refs';

/** How many clashes are listed before «وفيه {n} تعارض كمان». */
const SHOWN = 5;

/** Clashes with the teacher's own week, read better on the teacher's clock (a DST shift shows). */
const TEACHER_SIDE = new Set<Conflict['kind']>(['outside_availability', 'time_off']);

/**
 * «الميعاد ده مش من المواعيد المتاحة للمعلم/ة (السبت 31 أكتوبر 15:00، عند المعلم/ة 14:00 بتوقيت
 * القاهرة)»: the viewer's wall clock, plus the teacher's own (when it differs) for their
 * availability / time off. `clock.tz` is the viewer's zone (useViewerTz()).
 */
export function conflictText(
  c: Conflict,
  clock: Clock & { tz: string },
  teacherTz?: string,
): string {
  const at = new Date(c.startsAt);
  const tz = clock.tz;
  let when = lessonWhenAt(at, clock);
  if (teacherTz && !sameClockAt(at, { a: teacherTz, b: tz }) && TEACHER_SIDE.has(c.kind)) {
    const city = tzCity(teacherTz) ?? teacherTz;
    when += `${t.common.listSeparator}${t.booking.teacherClock.replace('{time}', clockOf(at, { ...clock, tz: teacherTz })).replace('{city}', city)}`;
  }
  return t.booking.conflict[c.kind].replace('{when}', when);
}

export interface ConflictNoticeProps {
  conflicts: readonly Conflict[];
  /** The teacher's zone, for their clock on availability / time-off lines. */
  teacherTz?: string;
  /** «اختار ميعاد تاني»: back to the slot grid. */
  onChangeSlot: () => void;
  /** «احجز رغم التعارض» with the reason (R-SCH-04); stored on the clashing lessons. Absent = never (the assistant). */
  onOverride?: ((reason: string) => void) | undefined;
  busy?: boolean;
  /** A form that already asked why (an edit's «السبب») starts the override reason with it. */
  initialReason?: string;
  /** Wording for the caller's own action (an edit saves, a booking books). */
  labels?: { override: string; reason: string };
  /** Who a `student_busy` clash is about, by student id: the line names them. */
  studentNames?: Readonly<Record<string, string>>;
}

/**
 * 409 `conflict` (R-SCH-04, issue B3): every clash in Arabic, then the two ways out: pick another
 * slot (the strong button), or go ahead anyway with a reason (quiet). The reason is required (the
 * API rejects a blank one). Always stacked: it sits in a 460px drawer as well as a wide page.
 */
export function ConflictNotice(p: ConflictNoticeProps) {
  const tz = useViewerTz();
  const clock = { ...useClock(), tz };
  const { conflicts, teacherTz, onChangeSlot, onOverride, busy = false, studentNames = {} } = p;
  const labels = p.labels ?? { override: t.booking.override, reason: t.booking.overrideReason };
  const titleId = useId();
  const [reason, setReason] = useState(p.initialReason ?? '');
  const [missing, setMissing] = useState(false);
  const more = conflicts.length - SHOWN;
  const submit = () => {
    if (reason.trim()) onOverride?.(reason.trim());
    else setMissing(true);
  };

  return (
    <section
      ref={revealOnMount}
      aria-labelledby={titleId}
      className="grid gap-3 rounded-md bg-danger-soft px-4 py-3.5 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cinnabar)_35%,transparent)]"
    >
      <div role="alert">
        <h3 id={titleId} className="flex items-center gap-2 font-semibold">
          <NuqtaGlyph shape="struck" className="text-danger" />
          <span>{t.booking.conflictTitle}</span>
        </h3>
      </div>
      <p className="text-xs text-ink-2">{t.schedule.zoneNote.replace('{city}', tzCity(tz) ?? tz)}</p>
      <ul className="grid gap-1.5 text-sm">
        {conflicts.slice(0, SHOWN).map((c, i) => (
          <li key={`${c.kind}-${c.startsAt}-${i}`} className="flex items-start gap-2">
            <NuqtaGlyph shape="hollow" className="mt-1.5 text-danger" />
            <span>{(c.studentId && studentNames[c.studentId] ? `${studentNames[c.studentId]}: ` : '') + conflictText(c, clock, teacherTz)}</span>
          </li>
        ))}
      </ul>
      {more > 0 && <p className="text-xs text-ink-2">{t.booking.conflictMore.replace('{n}', String(more))}</p>}
      <div className="grid gap-3 border-t border-rule pt-3">
        {onOverride && (
          <Field label={labels.reason} hint={t.booking.overrideHint} error={missing ? t.common.required : undefined}>
            {(f) => (
              <Input
                {...f}
                value={reason}
                placeholder={t.booking.overridePlaceholder}
                onChange={(e) => {
                  setReason(e.target.value);
                  setMissing(false);
                }}
              />
            )}
          </Field>
        )}
        <ButtonRow>
          <Button type="button" onClick={onChangeSlot}>
            {t.booking.changeSlot}
          </Button>
          {onOverride && (
            <Button type="button" variant="secondary" disabled={busy} onClick={submit}>
              {labels.override}
            </Button>
          )}
        </ButtonRow>
      </div>
    </section>
  );
}
