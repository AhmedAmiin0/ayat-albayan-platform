import { z } from 'zod';

/** `/report/<id>?studentId=…&recording=…`: whose report, and its visible recording if any. */
const reportSearch = z.object({
  studentId: z.string().catch(''),
  recording: z.string().optional().catch(undefined),
});

export type ReportSearch = z.infer<typeof reportSearch>;

export const parseReportSearch = (search: Record<string, unknown>): ReportSearch =>
  reportSearch.parse(search);
