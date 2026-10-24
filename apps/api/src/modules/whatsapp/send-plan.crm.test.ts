import { describe, expect, it } from 'vitest';
import { crmErrorFrom } from './crm-http';
import { CRM_AUTH, CRM_RATE_LIMITED, errorCode, failurePlan, UNCERTAIN } from './send-plan';
import { graphHttpError } from './template.mapper';
import { crmUnsupported } from './crm.client';

// docs/19 «crm driver»: what a CRM failure leads to in the sender, and in the template routes.

const NOW = new Date('2026-10-25T08:00:00Z');
const crm = (status: number, code: string, retryAfter: string | null = null) =>
  crmErrorFrom({ status, text: JSON.stringify({ error: { code, message: `${code} says no` } }), retryAfter });
const plan = (error: unknown, attempts = 1) => failurePlan({ error, attempts, now: NOW });

describe('failurePlan on the crm driver', () => {
  it('401 / 403: an auth hold, queued 15 min as crm_auth, the try not counted', () => {
    for (const status of [401, 403]) {
      expect(plan(crm(status, status === 401 ? 'unauthorized' : 'forbidden'), 2)).toEqual({
        status: 'queued', next_attempt_at: '2026-10-25T08:15:00.000Z', error_code: CRM_AUTH, error_text: expect.any(String), attempts: 1,
      });
    }
  });

  it('429: queued until Retry-After, the try not counted, even on the last attempt', () => {
    expect(plan(crm(429, 'rate_limited', '30'), 3)).toMatchObject({
      status: 'queued', next_attempt_at: '2026-10-25T08:00:30.000Z', error_code: CRM_RATE_LIMITED, attempts: 2,
    });
    expect(plan(crm(429, 'rate_limited', 'nonsense'))).toMatchObject({ next_attempt_at: '2026-10-25T08:01:00.000Z' });
  });

  it('502 meta_error, 500 template_malformed, a 4xx: failed at once with the CRM code and its message', () => {
    expect(plan(crm(502, 'meta_error'))).toEqual({ status: 'failed', next_attempt_at: null, error_code: 'crm_meta_error', error_text: expect.stringContaining('meta_error says no') });
    expect(plan(crm(500, 'template_malformed'))).toMatchObject({ status: 'failed', error_code: 'crm_template_malformed' });
    expect(plan(crm(400, 'bad_request'))).toMatchObject({ status: 'failed', error_code: 'crm_bad_request' });
    // The CRM's own WhatsApp connection is down: the line, not the message (held like a refused key).
    expect(plan(crm(400, 'whatsapp_not_configured'))).toMatchObject({ status: 'queued', error_code: 'crm_auth' });
  });

  it('500 internal / another 5xx: uncertain (failed, the admin checks before resending)', () => {
    expect(plan(crm(500, 'internal'))).toMatchObject({ status: 'failed', error_code: UNCERTAIN });
    expect(plan(crmErrorFrom({ status: 503, text: 'down', retryAfter: null }))).toMatchObject({ status: 'failed', error_code: UNCERTAIN });
    expect(errorCode(crm(404, 'not_found'))).toBe('crm_not_found');
  });
});

describe('graphHttpError on the crm driver', () => {
  it('a refused CRM key → 502 crm_auth; an unsupported call → 409 crm_managed', () => {
    expect([graphHttpError(crm(401, 'unauthorized')).getStatus(), graphHttpError(crm(401, 'unauthorized')).getResponse()]).toEqual([
      502,
      { code: 'crm_auth', message: 'crm_auth' },
    ]);
    expect(graphHttpError(crmUnsupported('the template list')).getStatus()).toBe(409);
  });
});
