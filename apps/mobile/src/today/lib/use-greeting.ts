import { useMyProfile } from '@/account';
import { useViewerTz } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { firstName, greetingPart } from './today-plan';

/**
 * «مساء الخير يا أحمد» by the local clock, the first name once the profile loads: the header line of
 * every tree's «اليوم» (owner 2026-10-28: no «اليوم» title under the tab of the same name).
 */
export function useGreeting(now: Date): string {
  const name = firstName(useMyProfile().data?.full_name);
  const greeting = t.today.greeting[greetingPart(now, useViewerTz())];
  return name ? t.today.greetingNamed.replace('{greeting}', greeting).replace('{name}', name) : greeting;
}
