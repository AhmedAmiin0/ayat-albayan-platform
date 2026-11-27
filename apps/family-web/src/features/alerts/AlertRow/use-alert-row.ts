import { alertTarget } from '@ab/client-core';
import { useNavigate } from '@tanstack/react-router';
import { useClock, dateAndClock, useFamilyChatOn } from '@ab/web-kit';
import { alertLink } from '@/features/alerts/alert-link';
import type { Props } from './AlertRow.types';

const DAY = { day: 'numeric', month: 'long' } as const;
export function useAlertRow({
  alert,
  kind,
  tz,
  onRead,
}: Pick<Props, 'alert' | 'kind' | 'tz' | 'onRead'>) {
  const navigate = useNavigate();
  const clock = useClock();
  const chatOn = useFamilyChatOn();
  const target = alertTarget(alert);
  const when = dateAndClock(new Date(alert.created_at), { ...clock, tz }, DAY);
  const open = () => {
    if (!alert.read_at) onRead(alert.id);
    if (target) void navigate(alertLink(target, { kind, chatOn }));
  };
  const unread = !alert.read_at;
  return { when, open, unread };
}
