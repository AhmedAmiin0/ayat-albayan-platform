import { dateText } from '@ab/shared';
import { viewerZone } from '@ab/web-kit/lib/clock-text';
import { locale } from '@ab/web-kit/lib/i18n/locale';

// Month as a word and full year, since numeric medium style can read as another date.
const DAY = { day: 'numeric', month: 'short', year: 'numeric' } as const;

export const feedbackDate = (iso: string): string =>
  dateText(new Date(iso), { tz: viewerZone(), locale }, DAY);
