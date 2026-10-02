import { describe, expect, it } from 'vitest';
import { errorCode, failurePlan, messageLabel, quickReplyPayloads, readyToSend, reportIdOf } from './send-plan';
import { REMINDER_24H, REPORT_READY, templateRow } from './whatsapp.fakes';
import { WaError } from './whatsapp.types';

const NOW = new Date('2026-10-02T08:00:00Z');
const meta = (code: number | null, status = 400) => new WaError('(#x) meta says no', { code, status, details: 'why' });

describe('failurePlan — retry with backoff or fail for good (docs/12 §3.3)', () => {
  it.each([
    { name: 'rate limit 130429', error: meta(130429), attempts: 1, next: '2026-10-02T08:01:00.000Z' },
    { name: 'Meta outage 131000', error: meta(131000, 500), attempts: 2, next: '2026-10-02T08:05:00.000Z' },
    { name: 'network (no code)', error: new WaError('fetch failed', { code: null, status: 0 }), attempts: 1, next: '2026-10-02T08:01:00.000Z' },
    { name: 'a bug or storage error', error: new Error('storage down'), attempts: 2, next: '2026-10-02T08:05:00.000Z' },
  ])('$name on try $attempts stays queued until the backoff', ({ error, attempts, next }) => {
    expect(failurePlan({ error, attempts, now: NOW })).toMatchObject({ status: 'queued', next_attempt_at: next });
  });

  it('the third retryable failure is final', () => {
    expect(failurePlan({ error: meta(130429), attempts: 3, now: NOW })).toMatchObject({ status: 'failed', next_attempt_at: null });
  });

  it.each([131026, 132001, 131047, 132000, 132015, 100, 190])('Meta %i fails at once, with code and text stored', (code) => {
    expect(failurePlan({ error: meta(code), attempts: 1, now: NOW })).toEqual({
      status: 'failed',
      next_attempt_at: null,
      error_code: String(code),
      error_text: '(#x) meta says no — why',
    });
  });

  it('error codes: Meta code, http_<status>, network, internal; text capped at 500', () => {
    expect(errorCode(meta(131026))).toBe('131026');
    expect(errorCode(new WaError('x', { code: null, status: 502 }))).toBe('http_502');
    expect(errorCode(new WaError('x', { code: null, status: 0 }))).toBe('network');
    expect(errorCode(new Error('x'))).toBe('internal');
    expect(failurePlan({ error: new Error('y'.repeat(600)), attempts: 3, now: NOW }).error_text).toHaveLength(500);
    expect(failurePlan({ error: 'boom', attempts: 3, now: NOW }).error_text).toBe('boom');
  });
});

describe('quickReplyPayloads', () => {
  const buttons = [
    { type: 'url' as const, url: 'https://meet.jit.si/{{1}}' },
    { type: 'quick_reply' as const, text: 'تمام', intent: 'confirm' as const },
    { type: 'quick_reply' as const, text: 'وقف', intent: 'stop' as const },
  ];

  it('derives intent:ref by index; URL buttons get an empty slot', () => {
    expect(quickReplyPayloads(buttons, { params: {}, ref: 'l1' })).toEqual(['', 'confirm:l1', 'stop:l1']);
  });

  it('the producer’s own payloads win', () => {
    expect(quickReplyPayloads(buttons, { params: { payloads: ['', 'confirm:lesson-9'] }, ref: 'l1' })).toEqual(['', 'confirm:lesson-9', 'stop:l1']);
  });
});

describe('readyToSend, reportIdOf, messageLabel', () => {
  const doc = { bucket: 'reports', path: 's/l.pdf', filename: 'f.pdf' };

  it('a session text and a plain template are ready; a document template waits for its PDF', () => {
    expect(readyToSend({ template_key: null, template_params: null, body: 'سلام' }, null)).toBe(true);
    expect(readyToSend({ template_key: 'booking_confirmation', template_params: {}, body: null }, templateRow())).toBe(true);
    expect(readyToSend({ template_key: 'booking_confirmation', template_params: {}, body: null }, null)).toBe(false);
    expect(readyToSend({ template_key: 'report_ready', template_params: { '1': 'x' }, body: null }, REPORT_READY)).toBe(false);
    expect(readyToSend({ template_key: 'report_ready', template_params: { document: doc }, body: null }, REPORT_READY)).toBe(true);
  });

  it('the report id is the dedup key suffix of report_ready rows only', () => {
    expect(reportIdOf('report_ready:r1')).toBe('r1');
    expect(reportIdOf('report_ready:')).toBeNull();
    expect(reportIdOf('renewal_due:s1')).toBeNull();
    expect(reportIdOf(null)).toBeNull();
  });

  it('the push names the template in Arabic, or quotes the start of a text', () => {
    expect(messageLabel({ template_key: REMINDER_24H.key, body: null })).toBe('تذكير قبل الحلقة بيوم');
    expect(messageLabel({ template_key: 'crm_legacy', body: null })).toBe('crm_legacy');
    expect(messageLabel({ template_key: null, body: '  وعليكم السلام  ' })).toBe('وعليكم السلام');
    expect(messageLabel({ template_key: null, body: 'ا'.repeat(50) })).toBe(`${'ا'.repeat(40)}…`);
  });
});
