import { z } from 'zod';

/** GET /sales/people (admin picker): a salesperson and how many leads they are working. */
export interface SalesPersonView {
  id: string;
  name: string;
  open_leads: number;
}

/** POST /leads/:id/assign: a sales profile id, or null to unassign. */
export const leadAssignSchema = z.object({ profileId: z.uuid().nullable() });
