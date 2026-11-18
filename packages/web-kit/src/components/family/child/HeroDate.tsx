import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { heroDate } from './hero-date';

/** Today's date as a gold-edged pill on the emerald hero (Gregorian, then Hijri). */
export function HeroDate({ tz }: { tz: string }) {
  return (
    <p className="inline-flex min-h-8 items-center gap-2 rounded-full border border-fam-gold/45
      bg-white/7 px-3.5 py-1 text-[13px] font-semibold text-fam-hero-ink sm:text-sm">
      <Icon name="calendar" className="size-4 text-fam-gold" />
      {heroDate(useNow(), { tz, locale })}
    </p>
  );
}
