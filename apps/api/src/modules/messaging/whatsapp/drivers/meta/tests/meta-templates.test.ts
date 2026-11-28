import { describe, expect, it } from 'vitest';
import { submitRequest } from '@/modules/messaging/whatsapp/drivers/meta/meta-templates';
import { KAPSO_ENV } from '@/modules/messaging/whatsapp/drivers/kapso/kapso.fakes';
import { STUB_ENV, templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';

describe('submitRequest', () => {
  it('creates a template Meta does not know yet', () => {
    const req = submitRequest(STUB_ENV, templateRow({ status: 'not_submitted', meta_id: 'meta-7' }));
    expect(req.path).toBe('stub-waba/message_templates');
    expect(req.json).toMatchObject({ name: 'booking_confirmation', category: 'UTILITY' });
  });

  it('edits a rejected template in place, with only its category and components', () => {
    const req = submitRequest(STUB_ENV, templateRow({ status: 'rejected', meta_id: 'meta-7' }));
    expect(req.path).toBe('meta-7');
    expect(Object.keys(req.json as object)).toEqual(['category', 'components']);
  });

  it('edits through the Kapso path on a Kapso line', () => {
    const req = submitRequest(KAPSO_ENV, templateRow({ status: 'rejected', meta_id: '123' }));
    expect(req.path).toBe('stub-waba/message_templates?hsm_id=123');
  });

  it('creates a rejected template that has no Meta id', () => {
    const req = submitRequest(STUB_ENV, templateRow({ status: 'rejected', meta_id: null }));
    expect(req.path).toBe('stub-waba/message_templates');
  });
});
