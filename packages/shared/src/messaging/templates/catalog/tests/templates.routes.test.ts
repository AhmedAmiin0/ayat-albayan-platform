import { describe, expect, it } from 'vitest';
import { authoredTemplateRoutes as authored } from '..';
import { aTemplateView } from '../../../../testing/templates';

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;
const EDIT = { body: 'نص {{1}}', footer: null, params: [{ name: 'var_1', sample: 'أحمد' }] };

describe('authoredTemplateRoutes', () => {
  it('keeps the paths of today, for template authors only', () => {
    expect(line(authored.list)).toBe('GET /messaging/templates/authored');
    expect(line(authored.create)).toBe('POST /messaging/templates/authored');
    expect(line(authored.edit)).toBe('PATCH /messaging/templates/authored/:key');
    const all = [authored.list, authored.create, authored.edit];
    expect(all.map((r) => r.permissions)).toEqual(all.map(() => ['templates.author']));
    expect(all.map((r) => r.tags)).toEqual(all.map(() => ['messaging']));
  });

  it('names a blank key null and refuses a third category', () => {
    const create = { key: ' ', category: 'utility', ...EDIT };
    expect(authored.create.body.parse(create).key).toBeNull();
    expect(authored.create.body.safeParse({ ...create, category: 'authentication' }).success)
      .toBe(false);
  });

  it('lets an author edit with plain quick replies only', () => {
    const url = { type: 'url', url: 'https://x.test/{{1}}', text: 'ادخل', example: 'https://x.test/a' };
    expect(authored.edit.body.safeParse({ ...EDIT, buttons: [url] }).success).toBe(false);
    expect(authored.list.response.parse([])).toEqual([]);
  });

  it('answers the list and each write with template views', () => {
    const view = aTemplateView({ line: 'chat', sales_starter: true });
    expect(authored.list.response.parse([view])).toEqual([view]);
    expect(authored.edit.response.parse(view)).toEqual(view);
    expect(authored.edit.params.safeParse({ key: 'a b' }).success).toBe(false);
  });
});
