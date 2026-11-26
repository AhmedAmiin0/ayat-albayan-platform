import type { UserRole } from '@ab/catalog';
import type { QueryClient } from '@tanstack/react-query';
import { meQuery, signOut, env } from '@ab/web-kit';

// Families on the family host (docs/51 §3): once VITE_FAMILY_ORIGIN is set on the staff build, a
// guardian or student reaching /portal or /account here is signed out of app. and sent there.
// Unset (dev, unit tests, the e2e staff server, any build before the go-live) or this very host:
// nothing changes, so the staff app can ship before the family host exists.


/** The same path on the family host, or null: no host set, or this page is already on it. */
export function familyHostUrl(path: string, here: string): string | null {
  const host = env.familyOrigin;
  return host && host !== here ? `${host}${path}` : null;
}

/** Who is on this browser: a role, signed out, or unknown (the read failed: never moved). */
type Viewer = UserRole | 'signed-out' | 'unknown';

const FAMILY_ROLES: ReadonlySet<Viewer> = new Set<Viewer>(['guardian', 'student']);

async function viewerOf(queryClient: QueryClient): Promise<Viewer> {
  const me = await queryClient.query(meQuery).catch(() => 'unknown' as const);
  if (me === 'unknown') return me;
  return me?.role ?? 'signed-out';
}

export interface FamilyPage {
  /** The page asked for, path + search. */
  path: string;
  /** /portal is the families' alone, so a signed-out visitor goes too; not on /account. */
  signedOutIsFamily: boolean;
}

const isFamily = (viewer: Viewer, page: FamilyPage): boolean =>
  viewer === 'signed-out' ? page.signedOutIsFamily : FAMILY_ROLES.has(viewer);

/** An installed app. icon (iOS web push lives in the Home Screen app): a notice, not a jump. */
const installed = (): boolean => window.matchMedia('(display-mode: standalone)').matches;

/**
 * beforeLoad of /portal and /account: for a family on the staff host (the gate above), this
 * browser's push and session go (signOut) and the page moves to the family host; an installed
 * app gets the URL back instead, for a notice with the link. null = stay (staff, an unknown
 * viewer, or no gate): requireRole decides as before.
 */
export async function leaveForFamilyHost(
  queryClient: QueryClient,
  page: FamilyPage,
): Promise<string | null> {
  const url = familyHostUrl(page.path, window.location.origin);
  if (url === null || !isFamily(await viewerOf(queryClient), page)) return null;
  await signOut(queryClient);
  if (!installed()) window.location.replace(url);
  return url;
}
