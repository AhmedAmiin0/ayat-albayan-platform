import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { numberView } from '../numbers.fixture';
import { createBody, draftErrors, draftOf, updateBody } from './number-form';

describe('number-form', () => {
  it('a new draft is an empty Meta notifications number; an edit starts from the record', () => {
    expect(draftOf()).toEqual({ label: '', purpose: 'notifications', provider: 'meta', phone_number_id: '', waba_id: '', app_id: '' });
    expect(draftOf(numberView()).waba_id).toBe('2000000001');
    expect(draftOf(numberView()).app_id).toBe('');
  });

  it('flags an empty or long label and ids outside META_ID_RE; empty optional ids are fine', () => {
    const ok = { ...draftOf(), label: 'Main', phone_number_id: '1000000001' };
    expect(draftErrors(ok)).toEqual({});
    expect(draftErrors({ ...ok, label: ' ', waba_id: 'a b', app_id: 'x'.repeat(65) })).toEqual({
      label: t.common.required, waba_id: t.numbers.form.invalidId, app_id: t.numbers.form.invalidId,
    });
    expect(draftErrors({ ...ok, label: 'x'.repeat(61), phone_number_id: '' }).phone_number_id).toBe(t.numbers.form.invalidId);
  });

  it('createBody trims and nulls empty ids; updateBody keeps only the changes', () => {
    const draft = { ...draftOf(numberView()), label: ' New name ', app_id: ' 3000000001 ' };
    expect(createBody(draft)).toMatchObject({ label: 'New name', app_id: '3000000001', enabled: false });
    expect(updateBody(numberView(), draft)).toEqual({ label: 'New name', app_id: '3000000001' });
    expect(updateBody(numberView(), draftOf(numberView()))).toEqual({});
  });
});
