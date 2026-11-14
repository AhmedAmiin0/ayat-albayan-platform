import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../core/http/index.js';
import { TEMPLATES_KEY, templateQueries, templateSends } from './templates-api.js';

const view = {
  key: 'k', meta_name: 'k', language: 'ar', category: 'utility', header_format: null,
  body_ar: 'نص', footer_ar: null, params: [], buttons: [], status: 'pending', last_error: null,
  line: 'chat', sales_starter: true,
};
const client = {
  apiFetch: vi.fn(async () => [view]),
  apiSend: vi.fn(async () => view),
} as unknown as ApiClient;
const input = { body: 'مرحبًا {{1}} بك', footer: null, params: [{ name: 'var_1', sample: 'أحمد' }], buttons: [] };

describe('templates routes', () => {
  it('lists the admin registry or the author\'s list, both under one key', async () => {
    const { templateListQuery } = templateQueries(client);
    expect(templateListQuery('admin').queryKey).toEqual(['messaging', 'templates']);
    expect(templateListQuery('author').queryKey).toEqual(['messaging', 'templates', 'authored']);
    expect(templateListQuery('author').queryKey.slice(0, 2)).toEqual(TEMPLATES_KEY);
    await expect(templateListQuery('author').queryFn()).resolves.toEqual([view]);
    expect(client.apiFetch).toHaveBeenCalledWith('/messaging/templates/authored');
  });

  it('creates and edits through the author routes; the admin through /content', async () => {
    const sends = templateSends(client);
    await sends.createAuthored({ key: null, category: 'utility', ...input });
    const created = expect.objectContaining({ category: 'utility' });
    expect(client.apiSend).toHaveBeenCalledWith('POST', '/messaging/templates/authored', created);
    await sends.editAuthored({ key: 'a b', input });
    expect(client.apiSend).toHaveBeenCalledWith('PATCH', '/messaging/templates/authored/a%20b', input);
    await sends.editContent({ key: 'lesson_reminder', input });
    expect(client.apiSend).toHaveBeenCalledWith('PATCH', '/messaging/templates/lesson_reminder/content', input);
  });
});
