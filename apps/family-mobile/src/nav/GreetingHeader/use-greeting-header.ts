import { dateText } from '@ab/time';
import { t, useIsTestAccount, useNow } from '@ab/mobile-kit';
import { useFamilyClock, usePickedChild } from '@/portal';
import type { GreetingHeaderProps } from './GreetingHeader.types';

export function useGreetingHeader({ title, over, student }: GreetingHeaderProps) {
  const clock = useFamilyClock();
  const today = dateText(useNow(), clock, { weekday: 'long', day: 'numeric', month: 'long' });
  const picked = usePickedChild();
  const switches = student !== undefined && picked?.id === student.id;
  const isTest = useIsTestAccount();
  const switchLabel = t.portal.app.pick.open.replace('{name}', title);
  return { line: over ?? today, switches, isTest, switchLabel };
}
