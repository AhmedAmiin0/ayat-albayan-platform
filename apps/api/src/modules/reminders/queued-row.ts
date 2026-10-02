import type { OutboundTemplate, TemplateParams } from '@ab/shared';

/** messages.template_params as the jobs write them (no document: only report_ready has one). */
export type QueuedParams = Omit<TemplateParams, 'document'>;

/** One `messages` insert for the Phase 4 sender (docs/12 §2.2). */
export interface QueuedMessage {
  direction: 'outbound';
  status: 'queued';
  phone_e164: string;
  guardian_id: string | null;
  lead_id: string | null;
  lesson_id: string | null;
  template_key: string;
  template_params: QueuedParams;
  dedup_key: string;
  scheduled_for: string;
  expires_at: string;
}

export interface QueuedRowInput {
  phone: string;
  guardianId?: string | null;
  leadId?: string | null;
  lessonId?: string | null;
  template: OutboundTemplate;
  dedupKey: string;
  now: Date;
  /** Past this the sender fails the row as `expired` instead of sending it late. */
  expiresAt: Date;
}

/** Due now (scheduled_for = now); the sender picks it up on its next tick. */
export function queuedRow(input: QueuedRowInput): QueuedMessage {
  const params: QueuedParams = input.template.params;
  return {
    direction: 'outbound',
    status: 'queued',
    phone_e164: input.phone,
    guardian_id: input.guardianId ?? null,
    lead_id: input.leadId ?? null,
    lesson_id: input.lessonId ?? null,
    template_key: input.template.key,
    template_params: params,
    dedup_key: input.dedupKey,
    scheduled_for: input.now.toISOString(),
    expires_at: input.expiresAt.toISOString(),
  };
}
