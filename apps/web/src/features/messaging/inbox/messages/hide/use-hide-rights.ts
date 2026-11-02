import { canHideMessages, canUnhideMessages } from '@ab/shared';
import { QueryClientContext } from '@tanstack/react-query';
import { useContext } from 'react';
import { meQuery } from '@/features/people/auth';

/**
 * «حذف من المنصة» for admin and sales, «إظهار» for the admin (owner 2026-10-30), from the signed-in
 * user the shell already read (no fetch here; none outside a query client); the API enforces the
 * same.
 */
export function useHideRights(): { hide: boolean; unhide: boolean } {
  const me = useContext(QueryClientContext)?.getQueryData(meQuery.queryKey);
  return { hide: canHideMessages(me), unhide: canUnhideMessages(me) };
}
