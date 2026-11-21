import { z } from 'zod';

/** GET /settings/public with the admin switch on (any other body reads as off). */
export const MaintenanceOnSchema = z.object({ maintenance_mode: z.literal(true) });
