import { intlLocale } from '@ab/shared';
import { locale } from '@/lib/locale';

// «3 أكتوبر 2026»: the month is a word and the year is whole, so a date can't be read as another
// (the numeric «26/10/01» of dateStyle 'medium' looks like 2001). Western digits via intlLocale.
const day = new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'short', year: 'numeric' });

export const feedbackDate = (iso: string): string => day.format(new Date(iso));
