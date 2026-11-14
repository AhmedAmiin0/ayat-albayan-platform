import { templateAuthorSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { authoredRow, authorKey } from './template-author.row';

describe('a sales template row', () => {
  it('is on the chat line, on the allow-list, written by its author, not submitted yet', () => {
    const input = templateAuthorSchema.parse({
      category: 'marketing',
      body: 'عرض خاص يا {{1}} لهذا الشهر',
      params: [{ name: 'var_1', sample: 'أحمد' }],
      buttons: [{ type: 'quick_reply', text: 'أريد التفاصيل' }],
    });
    const row = authoredRow(input, { key: 'summer_offer', by: 'user-1' });
    expect(row).toMatchObject({
      key: 'summer_offer', meta_name: 'summer_offer', line: 'chat', category: 'marketing',
      sales_starter: true, created_by: 'user-1', status: 'not_submitted', params: ['var_1'],
      samples: ['أحمد'], buttons: [],
      display: { header: null, buttons: [{ type: 'quick_reply', text: 'أريد التفاصيل' }] },
    });
  });

  it('names an unnamed template tpl_<day>_<6>', () => {
    expect(authorKey(new Date('2026-11-14T10:00:00Z'), 'AB-12cd-ef99')).toBe('tpl_20261114_ab12cd');
    expect(authorKey(new Date('2026-11-14T10:00:00Z'), 'x')).toBe('tpl_20261114_x00000');
  });
});
