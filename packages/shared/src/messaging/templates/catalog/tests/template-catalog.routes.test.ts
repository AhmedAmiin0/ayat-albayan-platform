import { describe, expect, it } from 'vitest';
import { templateCatalogRoutes as catalog } from '..';
import { aLineSync } from './template-sync.builder';
import { aTemplateView } from './template-view.builder';

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;
const FACTS = {
  line: 'chat', configured: true, provider: 'kapso', waba_id: null, phone_number_id: null,
} as const;
const CREATE = { key: 'offer_x', line: 'chat', category: 'utility', body: 'نص' };

describe('templateCatalogRoutes', () => {
  it('keeps the paths of today', () => {
    expect(line(catalog.list)).toBe('GET /messaging/templates');
    expect(line(catalog.create)).toBe('POST /messaging/templates');
    expect(line(catalog.lines)).toBe('GET /messaging/templates/lines');
    expect(line(catalog.health)).toBe('POST /messaging/templates/health');
  });

  it('lets any reader list and only template managers change, tagged messaging', () => {
    expect(catalog.list.permissions).toEqual(['messages.read']);
    const managed = [catalog.create, catalog.lines, catalog.health];
    expect(managed.map((r) => r.permissions)).toEqual(managed.map(() => ['templates.manage']));
    const all = [catalog.list, ...managed];
    expect(all.map((r) => r.tags)).toEqual(all.map(() => ['messaging']));
  });

  it('fills the create defaults and refuses an unknown line', () => {
    expect(catalog.create.body.parse(CREATE)).toMatchObject({ language: 'ar', params: [] });
    expect(catalog.create.body.safeParse({ ...CREATE, line: 'sms' }).success).toBe(false);
  });

  it('checks one line or every line, from the body or the query', () => {
    expect(catalog.health.body.parse(undefined)).toBeUndefined();
    expect(catalog.health.body.parse({ line: 'chat' })).toEqual({ line: 'chat' });
    expect(catalog.health.query.parse({})).toEqual({});
    expect(catalog.health.query.safeParse({ line: 'sms' }).success).toBe(false);
  });

  it('answers views', () => {
    const view = aTemplateView();
    expect(catalog.list.response.parse([view])).toEqual([view]);
    expect(catalog.create.response.parse(view)).toEqual(view);
    const lineView = { ...FACTS, last_checked_at: null, last_sync: aLineSync() };
    expect(catalog.lines.response.parse([lineView])).toEqual([lineView]);
    const health = { lines: [aLineSync()], templates: [view] };
    expect(catalog.health.response.parse(health)).toEqual(health);
  });
});
