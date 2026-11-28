import { z } from 'zod';

const total = z.number().catch(0);
const NONE = { copied: 0, failed: 0, skipped: 0, remaining: 0 };

/**
 * crm_media_copy_counts' jsonb: a missing or non-number total reads 0, a non-object all zeros.
 * `remaining`: CRM file links on ANY host still without a copy or a failure row (the batch picks
 * only crm_media_host's); the old bucket goes private at 0.
 */
export const crmCopyCountsSchema = z
  .object({ copied: total, failed: total, skipped: total, remaining: total })
  .catch(NONE);

/** The totals of a finished copy (its one audit row). */
export type CrmCopyCounts = z.infer<typeof crmCopyCountsSchema>;
