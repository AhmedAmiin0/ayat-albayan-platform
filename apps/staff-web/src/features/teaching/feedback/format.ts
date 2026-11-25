import { dateText } from '@ab/time';
import { viewerZone, locale } from '@ab/web-kit';

// Month as a word and full year, since numeric medium style can read as another date.
const DAY = { day: 'numeric', month: 'short', year: 'numeric' } as const;

export const feedbackDate = (iso: string): string =>
  dateText(new Date(iso), { tz: viewerZone(), locale }, DAY);
