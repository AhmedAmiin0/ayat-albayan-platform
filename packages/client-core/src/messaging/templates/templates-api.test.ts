import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../core/http';
import { adminTemplateCalls } from './admin-templates-api';
import { authoredTemplateCalls } from './authored-templates-api';
import { TEMPLATES_KEY, templateQueries } from './templates-api';

const view = {
  key: 'k', meta_name: 'k', language: 'ar', category: 'utility', header_format: null,
  body_ar: 'نص', footer_ar: null, params: [], buttons: [], status: 'pending', quality: null,
  meta_id: null, last_checked_at: null, last_error: null, submitted_at: null, line: 'chat',
  sales_starter: true,
};
const clientOf = () => ({
  apiFetch: vi.fn(async () => [view]),
  apiSend: vi.fn(async () => view),
}) as unknown as ApiClient & { apiFetch: ReturnType<typeof vi.fn>; apiSend: ReturnType<typeof vi.fn> };
const input = { body: 'مرحبًا {{1}} بك', footer: null, params: [{ name: 'var_1', sample: 'أحمد' }], buttons: [] };

describe('template lists', () => {
  it('lists the admin registry or the author\'s list, both under one key', async () => {
    const client = clientOf();
    const { templateListQuery } = templateQueries(client);
    expect(templateListQuery('admin').queryKey).toEqual(['messaging', 'templates']);
    expect(templateListQuery('author').queryKey).toEqual(['messaging', 'templates', 'authored']);
    expect(templateListQuery('author').queryKey.slice(0, 2)).toEqual(TEMPLATES_KEY);
    await expect(templateListQuery('author').queryFn()).resolves.toEqual([view]);
    expect(client.apiFetch).toHaveBeenCalledWith('/messaging/templates/authored');
    await expect(templateListQuery('admin').queryFn()).resolves.toEqual([view]);
    expect(client.apiFetch).toHaveBeenLastCalledWith('/messaging/templates');
  });

  it('refuses a list row the template view does not know', async () => {
    const client = clientOf();
    client.apiFetch.mockResolvedValue([{ ...view, status: 'live' }]);
    await expect(authoredTemplateCalls(client).list()).rejects.toThrow();
  });
});

describe('template writes', () => {
  it('creates and edits through the author routes', async () => {
    const client = clientOf();
    const authored = authoredTemplateCalls(client);
    await expect(authored.create({ key: null, category: 'utility', ...input })).resolves.toEqual(view);
    const created = expect.objectContaining({ category: 'utility' });
    expect(client.apiSend).toHaveBeenCalledWith('POST', '/messaging/templates/authored', created);
    await authored.edit({ key: 'offer_x', input });
    expect(client.apiSend).toHaveBeenCalledWith('PATCH', '/messaging/templates/authored/offer_x', input);
  });

  it('edits any template\'s words through /content as the admin', async () => {
    const client = clientOf();
    await adminTemplateCalls(client).editContent({ key: 'lesson_reminder', input });
    expect(client.apiSend).toHaveBeenCalledWith('PATCH', '/messaging/templates/lesson_reminder/content', input);
  });
});
