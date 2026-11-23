import { isAccountDisabled, picksChild } from '@ab/client-core';
import type { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { meQuery, returnSearchOf, signOut } from '@ab/web-kit/auth';
import { portalHomeQuery } from '@ab/web-kit/portal';

/** Who opened a family page: a guardian or a student, or a staff login (the «wrongApp» notice). */
export type Visitor = 'family' | 'staff';

type Arrival = Visitor | 'out';

const VISITOR: Readonly<Record<string, Visitor>> = { guardian: 'family', student: 'family' };

/** The signed-in user, or null (signed out, or an account disabled mid-session). */
const whoIsIn = (queryClient: QueryClient) =>
  queryClient.query({ ...meQuery, staleTime: 'static' }).catch((error: unknown) => {
    if (isAccountDisabled(error)) return null;
    throw error;
  });

type Arrive = (queryClient: QueryClient, back: string) => Promise<Visitor>;

const ARRIVE: Readonly<Record<Arrival, Arrive>> = {
  family: () => Promise.resolve('family'),
  staff: async (queryClient) => {
    await signOut(queryClient);
    return 'staff';
  },
  out: (_queryClient, back) => {
    // redirect() throws the router's redirect itself (`throw: true`): nothing is returned.
    redirect({ to: '/login', search: returnSearchOf(back), throw: true });
    return Promise.resolve('staff');
  },
};

/**
 * The family pages' guard (docs/51 §3): signed out → /login, carrying the page asked for; a staff
 * login is signed out here and sees «wrongApp» with the link to the staff app.
 */
export async function requireFamily(queryClient: QueryClient, back: string): Promise<Visitor> {
  const role = (await whoIsIn(queryClient))?.role;
  const arrival: Arrival = role ? (VISITOR[role] ?? 'staff') : 'out';
  return ARRIVE[arrival](queryClient, back);
}

interface PageGuard {
  queryClient: QueryClient;
  visitor: Visitor;
}

/** «اختر الطالب» is a guardian of several children's (owner 2026-11-16); anyone else goes home. */
export async function requirePicker(guard: PageGuard): Promise<void> {
  if (guard.visitor !== 'family') return;
  const home = await guard.queryClient.query({ ...portalHomeQuery, staleTime: 'static' });
  if (!picksChild(home)) redirect({ to: '/portal', throw: true });
}
