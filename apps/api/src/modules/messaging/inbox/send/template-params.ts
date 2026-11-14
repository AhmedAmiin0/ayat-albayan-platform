import { templateParamProblem, type TemplateView, type ThreadTemplate } from '@ab/shared';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { missingParams } from '@/modules/messaging/inbox/threads/threads.mapper';

/**
 * H4's params check: every variable filled (400 missing_params), then Meta's rules (132018, owner
 * 2026-11-14): no newline, tab or 5+ spaces in a body value (400 param_not_normalised) and the
 * filled body within TEMPLATE_LIMITS.body (400 body_too_long). The clients normalise with the same
 * shared helper (free-text.ts) before they send; this refuses anything that skipped it.
 */
export function assertSendableParams(template: TemplateView, params: ThreadTemplate['params']): void {
  const missing = missingParams(template, params);
  if (missing.length) throw waHttpError('missing_params', 400, { missing });
  const problem = templateParamProblem(template.body_ar, params);
  if (problem) throw waHttpError(problem, 400);
}
