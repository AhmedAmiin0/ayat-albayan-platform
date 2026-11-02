import { dateText } from '@ab/shared';
import { viewerZone } from '@/lib/clock-text';
import { locale } from '@/lib/i18n/locale';

// «3 أكتوبر 2026»: the month is a word and the year is whole, so a date can't be read as another
// (the numeric «26/10/01» of dateStyle 'medium' looks like 2001). Western digits via intlLocale.
const DAY = { day: 'numeric', month: 'short', year: 'numeric' } as const;

export const feedbackDate = (iso: string): string =>
  dateText(new Date(iso), { tz: viewerZone(), locale }, DAY);
