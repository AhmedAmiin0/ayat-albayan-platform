import { aMessageView } from '@ab/shared/testing';
import { vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';

export const ID = 'b1111111-1111-4111-8111-111111111111';
const AT = '2026-10-01T10:00:00+00:00';
export const CALL = {
  id: ID,
  phone_e164: '+966501234567',
  direction: 'outbound',
  status: 'ringing',
  end_reason: null,
  display_name: null,
  staff_id: ID,
  started_at: AT,
  answered_at: null,
  ended_at: null,
  duration_seconds: null,
};
export const ACTIVE = { ...CALL, offer_sdp: null, answer_sdp: null };
export const MESSAGE = aMessageView({
  phone_e164: '+966501234567',
  template_key: 'call_permission',
  created_at: AT,
});

const answeringFn = (answer: unknown) => vi.fn((..._ask: unknown[]) => Promise.resolve(answer));

interface Answering {
  api: ApiClient;
  apiFetch: ReturnType<typeof answeringFn>;
  apiSend: ReturnType<typeof answeringFn>;
}

export function answering(answer: unknown): Answering {
  const apiFetch = answeringFn(answer);
  const apiSend = answeringFn(answer);
  return { api: { apiFetch, apiSend }, apiFetch, apiSend };
}
