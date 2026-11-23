import { z } from 'zod';

const testFile = z.string().regex(/^apps\/api\/src\/.+\.test\.ts$/);

/** 'GET /portal/students/:id/lessons' → the test that sends it another user's id. */
export const ownedRouteTests = z.record(z.string().regex(/^[A-Z]+ \/\S*:\S*$/), testFile);
export type OwnedRouteTests = z.infer<typeof ownedRouteTests>;
