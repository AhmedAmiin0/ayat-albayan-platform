import { canHideMessages, canUnhideMessages } from '@ab/shared';
import { QueryClientContext } from '@tanstack/react-query';
import { useContext } from 'react';
import { meQuery, type Me } from '@/features/people/auth';

/** The signed-in user the shell already read (no fetch here; none outside a query client). */
export function useSignedIn(): Me | null {
  return useContext(QueryClientContext)?.getQueryData(meQuery.queryKey) ?? null;
}

/**
 * «حذف من المنصة» for admin and sales, «إظهار» for the admin (owner 2026-10-30), from the signed-in
 * user (useSignedIn); the API enforces the same.
 */
export function useHideRights(): { hide: boolean; unhide: boolean } {
  const me = useSignedIn();
  return { hide: canHideMessages(me), unhide: canUnhideMessages(me) };
}
