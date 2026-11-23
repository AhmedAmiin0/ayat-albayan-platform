import {
  dayEndExpiry, EXPIRY_DAY_CHOICES, expiresAtOf, expiryDayRange, fillSlots,
  SHORT_LINK_PURGE_DAYS, type LinkExpiry,
} from '@ab/client-core';
import { counted } from '@ab/core';
import { localDateIn } from '@ab/time';
import { useId } from 'react';
import { RadioChips } from '@ab/web-kit/components/ui/form/radio-chips';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { NuqtaGlyph } from '@ab/web-kit/components/ui/display/nuqta-glyph';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useLinkDates } from '@/features/platform/short-links/shared/use-link-dates';

const F = t.shortLinks.form;
const OTHER = 'date';

interface ExpiryFieldProps {
  expiry: LinkExpiry;
  onChange: (next: LinkExpiry) => void;
  error?: string | undefined;
}

const OPTIONS = [
  ...EXPIRY_DAY_CHOICES.map((n) => ({ value: String(n), label: counted(F.days, n) })),
  { value: OTHER, label: F.otherDate },
];

const chipOf = (expiry: LinkExpiry): string =>
  expiry.kind === 'days' ? String(expiry.days) : OTHER;

/**
 * «مدة الصلاحية» (board LinkXWebCreate): 1, 3, 7 or 30 days or another date, then when it ends
 * («ينتهي الثلاثاء 24 نوفمبر، 14:06») and when it is deleted with its visits.
 */
export function ExpiryField({ expiry, onChange, error }: ExpiryFieldProps) {
  const dates = useLinkDates();
  const dateId = useId();
  const clock = { now: dates.now, tz: dates.tz };
  const at = expiresAtOf(expiry, clock);
  const day = at ? localDateIn(Date.parse(at), dates.tz) : '';
  const range = expiryDayRange(clock);
  const pickDay = (value: string) => {
    if (value === '') return;
    onChange(dayEndExpiry(value, dates.tz));
  };
  const pick = (value: string) =>
    onChange(value === OTHER ? dayEndExpiry(day, dates.tz) : { kind: 'days', days: Number(value) });
  return (
    <div className="grid gap-2">
      <RadioChips
        name="expiry"
        legend={F.expiry}
        options={OPTIONS}
        value={chipOf(expiry)}
        onChange={pick}
      />
      {expiry.kind === 'date' && (
        <Input
          id={dateId}
          type="date"
          aria-label={F.otherDate}
          className="max-w-[220px]"
          min={range.min}
          max={range.max}
          value={day}
          onChange={(e) => pickDay(e.target.value)}
        />
      )}
      {at && (
        <p className="text-sm font-semibold">{fillSlots(F.endsAt, { date: dates.dayClock(at) })}</p>
      )}
      <p className="text-xs text-ink-3">
        {fillSlots(F.purgeNote, { days: counted(F.days, SHORT_LINK_PURGE_DAYS) })}
      </p>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-danger">
          <NuqtaGlyph shape="struck" />
          {error}
        </p>
      )}
    </div>
  );
}
