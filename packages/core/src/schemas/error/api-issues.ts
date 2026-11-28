import type { z } from 'zod';
import { apiIssueSchema, type ApiIssue } from './api-error';

/** The issues of a failed parse as a 400 body lists them; a root issue has the path ''. */
export function toApiIssues(issues: readonly z.core.$ZodIssue[]): ApiIssue[] {
  return issues.map((issue) => apiIssueSchema.parse({ ...issue, path: issue.path.join('.') }));
}
