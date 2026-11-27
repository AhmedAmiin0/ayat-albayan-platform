import { id, instant } from '@ab/core';
import { z } from 'zod';
import { conflictSchema } from '../../lessons';

const count = z.int().nonnegative();

/** What one horizon pass did: rules read, lessons added, rules that failed, rules ended. */
export const horizonRunSummarySchema = z.object({
  rules: count,
  inserted: count,
  failed: count,
  ended: count,
});
export type HorizonRunSummary = z.infer<typeof horizonRunSummarySchema>;

/** One rule's top-up: its new last lesson, how many were added, the clashes stored on them. */
export const ruleExtendResultSchema = z.object({
  rule_id: id(),
  until: instant,
  inserted: count,
  conflicts: z.array(conflictSchema),
});
export type RuleExtendResult = z.infer<typeof ruleExtendResultSchema>;
