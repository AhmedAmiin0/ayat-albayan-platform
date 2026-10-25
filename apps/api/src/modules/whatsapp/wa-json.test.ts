import { describe, expect, it } from 'vitest';
import { templateParams } from './wa-json';

// messages.template_params as the sender reads it (docs/19): a bad crm part never costs the Meta values.

describe('templateParams', () => {
  it('keeps the crm values beside the Meta ones', () => {
    expect(templateParams({ '1': 'سارة', crm: { report: 'trial' } })).toEqual({ '1': 'سارة', crm: { report: 'trial' } });
  });

  it('a malformed crm part is dropped, the rest is kept', () => {
    expect(templateParams({ '1': 'سارة', button: 'r/1', crm: { report: 'weekly' } })).toEqual({ '1': 'سارة', button: 'r/1' });
  });
});
