import { useMyProfile, t } from '@ab/mobile-kit';
import { useViewerTz } from '@/core/lib/clock';
import { firstName, greetingPart } from './today-plan';

/** The greeting is every tree's header line, by the local clock. */
export function useGreeting(now: Date): string {
  const name = firstName(useMyProfile().data?.full_name);
  const greeting = t.today.greeting[greetingPart(now, useViewerTz())];
  return name ? t.today.greetingNamed.replace('{greeting}', greeting).replace('{name}', name) : greeting;
}
