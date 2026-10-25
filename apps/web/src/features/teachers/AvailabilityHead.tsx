import { intlLocale, nextDstTransition } from '@ab/shared';
import { useId, useMemo } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { Label } from '@/components/ui/form/label';
import { Ltr } from '@/components/ui/display/ltr';
import { TimeZoneSelect, tzCity } from '@/components/ui/form/time-zone-select';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';

type Props = { tz: string; onTz: (tz: string) => void };

/** An ar.json sentence with its `{tz}` / `{city}` slot filled by the city, or the LTR id. */
function ZoneText({ template, tz }: { template: string; tz: string }) {
  const [before = '', after = ''] = template.split(/\{(?:tz|city)\}/);
  return (
    <>
      {before}
      {tzCity(tz) ?? <Ltr>{tz}</Ltr>}
      {after}
    </>
  );
}

const weekday = (tz: string) => new Intl.DateTimeFormat(intlLocale(locale), { timeZone: tz, weekday: 'long' });
const dayMonth = (tz: string) =>
  new Intl.DateTimeFormat(intlLocale(locale), { timeZone: tz, day: 'numeric', month: 'long' });

/** «من الجمعة 30 أكتوبر القاهرة بترجع ساعة» when the zone shifts within 30 days (docs/07 §8). */
function dstTemplate(tz: string): string | null {
  const shift = nextDstTransition(tz, new Date());
  if (!shift) return null;
  const date = `${weekday(tz).format(shift.day)} ${dayMonth(tz).format(shift.day)}`;
  return (shift.dir === 'back' ? t.availability.dstBack : t.availability.dstForward).replace('{date}', date);
}

/**
 * Panel title, the zone the grid is saved in (rule 6), and the note line saying so, with the DST
 * warning. TODO(R-SCH-01): the «بتوقيتها | بتوقيت الرياض» view switch (shows the week converted
 * to the admin's zone; weekday-shifting conversion lands with scheduling).
 */
export function AvailabilityHead({ tz, onTz }: Props) {
  const id = useId();
  const dst = useMemo(() => dstTemplate(tz), [tz]);
  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5">
        <h2 className="font-display text-h3 font-bold">{t.availability.title}</h2>
        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
          <Label htmlFor={id}>{t.availability.tz}</Label>
          <TimeZoneSelect
            id={id}
            className="w-full sm:w-auto sm:min-w-[210px] sm:max-w-[280px]"
            value={tz}
            onValue={onTz}
          />
        </div>
      </div>
      <p className="mb-4 flex items-start gap-2 rounded-md bg-sunk px-3.5 py-2.5 text-xs text-ink-2">
        <Icon name="globe" className="mt-0.5 size-4 text-ink-3" />
        <span>
          <span className="block">
            <ZoneText template={t.availability.tzHint} tz={tz} />
          </span>
          {dst && (
            <span className="block font-semibold text-ink" data-dst="">
              <ZoneText template={dst} tz={tz} />
            </span>
          )}
        </span>
      </p>
    </>
  );
}
