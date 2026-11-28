import type { activitySessionRoutes } from '@ab/shared';

/** What the activity log is told about a sign-in (the API never sees the sign-in itself). */
export type SessionEvent = keyof typeof activitySessionRoutes;
