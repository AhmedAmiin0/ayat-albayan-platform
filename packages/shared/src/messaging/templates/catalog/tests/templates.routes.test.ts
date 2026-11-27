import { describe, expect, it } from 'vitest';
import { authoredTemplateRoutes as authored, templateRoutes } from '..';
import { aTemplateView } from './template-view.builder';

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;
const EDIT = { body: 'نص {{1}}', footer: null, params: [{ name: 'var_1', sample: 'أحمد' }] };

describe('templateRoutes', () => {
  it('keeps the paths of today, tagged messaging', () => {
    expect(line(templateRoutes.list)).toBe('GET /messaging/templates');
    expect(line(templateRoutes.editContent)).toBe('PATCH /messaging/templates/:key/content');
    expect(templateRoutes.list.permissions).toEqual(['messages.read']);
    expect(templateRoutes.editContent.permissions).toEqual(['templates.manage']);
    expect(templateRoutes.list.tags).toEqual(['messaging']);
  });

  it('answers the list and the edit with template views', () => {
    const view = aTemplateView();
    expect(templateRoutes.list.response.parse([view])).toEqual([view]);
    expect(templateRoutes.editContent.response.parse(view)).toEqual(view);
  });

  it('takes a registry key and the new words', () => {
    expect(templateRoutes.editContent.params.safeParse({ key: 'a b' }).success).toBe(false);
    expect(templateRoutes.editContent.params.parse({ key: 'report_ready' })).toEqual({
      key: 'report_ready',
    });
    expect(templateRoutes.editContent.body.parse(EDIT)).toEqual({ ...EDIT, buttons: [] });
  });
});

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
});
