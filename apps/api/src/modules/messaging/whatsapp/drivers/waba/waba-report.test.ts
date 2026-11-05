import { describe, expect, it, vi } from 'vitest';
import { REPORT_READY, templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { afterDocument, sendReport, wabaReport } from './waba-report';

// docs/19: the old script's report (PDF, then report_session / report_trial_session), any driver.

const TO = '+966500000005';
const DOC = { bucket: 'reports', path: 'r/1.pdf', filename: 'AB-0001_report.pdf' };
const OLD_FLOW = templateRow({ ...REPORT_READY, crm_name: 'report_session' });
const send = (report?: 'trial' | 'regular', template = OLD_FLOW) => ({
  to: TO,
  template,
  params: { '1': 'سارة', '2': 'الأحد', document: DOC, ...(report ? { crm: { report } } : {}) },
  documentUrl: 'https://s.local/signed.pdf',
});

describe('wabaReport', () => {
  it('the PDF by link with its name, then the template by the lesson\'s kind, no values', () => {
    expect(wabaReport(send('trial'))).toEqual({
      document: { to: TO, url: 'https://s.local/signed.pdf', filename: DOC.filename },
      template: { name: 'report_trial_session', language: 'ar', body: [], header: null, buttons: [] },
    });
    expect(wabaReport(send('regular'))?.template.name).toBe('report_session');
    expect(wabaReport(send())?.template.name).toBe('report_session');
  });

  it('not the old flow: report_ready on its own name, or any other key', () => {
    expect(wabaReport(send('trial', REPORT_READY))).toBeNull();
    expect(wabaReport({ ...send(), template: templateRow({ crm_name: 'report_session' }) })).toBeNull();
  });

  it('the PDF missing: refused before any send (132000)', () => {
    expect(() => wabaReport({ ...send(), documentUrl: null })).toThrow(WaError);
  });
});

describe('sendReport', () => {
  it('the PDF first, then the template; the template\'s answer is the row\'s', async () => {
    const order: string[] = [];
    const sent = await sendReport({
      document: async () => order.push('pdf'),
      template: async () => (order.push('template'), { waMessageId: 'wamid.t' }),
    });
    expect(order).toEqual(['pdf', 'template']);
    expect(sent).toEqual({ waMessageId: 'wamid.t' });
  });

  it('the PDF fails: nothing else is sent, its own error', async () => {
    const template = vi.fn();
    const pdf = new WaError('down', { code: null, status: 503 });
    await expect(sendReport({ document: () => Promise.reject(pdf), template })).rejects.toBe(pdf);
    expect(template).not.toHaveBeenCalled();
  });

  it('the template fails after the PDF: uncertain, never resent automatically', async () => {
    const refused = new WaError('missing', { code: 132001, status: 404, template: 'report_session' });
    const steps = { document: async () => 1, template: () => Promise.reject(refused) };
    const e = await sendReport(steps).catch((x: unknown) => x);
    expect((e as WaError).info).toMatchObject({ uncertain: true, code: 132001, template: 'report_session' });
    expect((e as WaError).message).toMatch(/refused its template/);
  });
});

describe('afterDocument', () => {
  it('a refusal says so; a timeout or an unknown error may have gone', () => {
    expect(afterDocument(new WaError('x', { code: 100, status: 400 })).message).toMatch(/refused/);
    expect(afterDocument(new WaError('t', { code: null, status: 0, uncertain: true })).message).toMatch(/may have gone/);
    expect(afterDocument(new Error('bug')).info).toMatchObject({ uncertain: true, code: null, status: 0 });
  });
});
