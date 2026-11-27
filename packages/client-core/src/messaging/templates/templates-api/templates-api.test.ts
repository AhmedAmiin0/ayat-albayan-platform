import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../core/http';
import { adminTemplateCalls } from '../admin-templates-api';
import { authoredTemplateCalls } from '../authored-templates-api';
import { TEMPLATES_KEY, templateQueries } from './templates-api';

const view = {
  key: 'k', meta_name: 'k', language: 'ar', category: 'utility', header_format: null,
  body_ar: 'نص', footer_ar: null, params: [], buttons: [], status: 'pending', quality: null,
  meta_id: null, last_checked_at: null, last_error: null, submitted_at: null, line: 'chat',
  sales_starter: true,
};
const clientOf = () => ({
  apiFetch: vi.fn<ApiClient['apiFetch']>(async () => [view]),
  apiSend: vi.fn<ApiClient['apiSend']>(async () => view),
});
const input = {
  body: 'مرحبًا {{1}} بك', footer: null, params: [{ name: 'var_1', sample: 'أحمد' }], buttons: [],
};

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
    const create = authored.create({ key: null, category: 'utility', ...input });
    await expect(create).resolves.toEqual(view);
    const created = expect.objectContaining({ category: 'utility' });
    expect(client.apiSend).toHaveBeenCalledWith('POST', '/messaging/templates/authored', created);
    await authored.edit({ key: 'offer_x', input });
    const path = '/messaging/templates/authored/offer_x';
    expect(client.apiSend).toHaveBeenCalledWith('PATCH', path, input);
  });

  it('edits any template\'s words through /content as the admin', async () => {
    const client = clientOf();
    await adminTemplateCalls(client).editContent({ key: 'lesson_reminder', input });
    const path = '/messaging/templates/lesson_reminder/content';
    expect(client.apiSend).toHaveBeenCalledWith('PATCH', path, input);
  });
});

describe('template catalog', () => {
  const line = {
    line: 'chat', configured: true, provider: 'meta', waba_id: '1', phone_number_id: '2',
    last_checked_at: null, last_sync: null,
  };

  it('creates on the registry and reads each line\'s facts', async () => {
    const client = clientOf();
    const admin = adminTemplateCalls(client);
    const body = { key: 'offer_x', line: 'chat', category: 'utility', body: 'نص' } as const;
    await expect(admin.create(body)).resolves.toEqual(view);
    expect(client.apiSend).toHaveBeenCalledWith('POST', '/messaging/templates', body);
    client.apiFetch.mockResolvedValue([line]);
    await expect(admin.lines()).resolves.toEqual([line]);
    expect(client.apiFetch).toHaveBeenLastCalledWith('/messaging/templates/lines');
  });

  it('checks one line or every line', async () => {
    const client = clientOf();
    client.apiSend.mockResolvedValue({ lines: [], templates: [view] });
    const admin = adminTemplateCalls(client);
    await expect(admin.health({ line: 'chat' })).resolves.toEqual({ lines: [], templates: [view] });
    const path = '/messaging/templates/health';
    expect(client.apiSend).toHaveBeenCalledWith('POST', path, { line: 'chat' });
    await admin.health({});
    expect(client.apiSend).toHaveBeenLastCalledWith('POST', path, {});
  });
});

describe('template edits', () => {
  const at = (end: string) => `/messaging/templates/a%20b/${end}`;

  it('submits, moves and sets the number of one template', async () => {
    const client = clientOf();
    const admin = adminTemplateCalls(client);
    await expect(admin.submit('a b')).resolves.toEqual(view);
    expect(client.apiSend).toHaveBeenLastCalledWith('POST', at('submit'), undefined);
    client.apiSend.mockResolvedValue({ template: view, sync: null });
    await expect(admin.moveLine({ key: 'a b', line: 'chat' }))
      .resolves.toEqual({ template: view, sync: null });
    expect(client.apiSend).toHaveBeenLastCalledWith('PATCH', at('line'), { line: 'chat' });
    client.apiSend.mockResolvedValue({ template: view, not_approved_on_number: false });
    await admin.setNumber({ key: 'a b', number_id: null });
    expect(client.apiSend).toHaveBeenLastCalledWith('PUT', at('number'), { number_id: null });
  });

  it('sets the crm status, the crm name and the allow-list', async () => {
    const client = clientOf();
    const admin = adminTemplateCalls(client);
    await admin.setCrmStatus({ key: 'a b', status: 'approved' });
    expect(client.apiSend).toHaveBeenLastCalledWith('PUT', at('crm-status'), { status: 'approved' });
    const name = { crm_name: null, crm_language: null };
    await admin.setCrmName({ key: 'a b', ...name });
    expect(client.apiSend).toHaveBeenLastCalledWith('PUT', at('crm-name'), name);
    await admin.setStarter({ key: 'a b', on: true });
    expect(client.apiSend)
      .toHaveBeenLastCalledWith('PATCH', at('starter'), { sales_starter: true });
  });

  it('refuses a number answer without its warning', async () => {
    const client = clientOf();
    client.apiSend.mockResolvedValue({ template: view });
    await expect(adminTemplateCalls(client).setNumber({ key: 'k', number_id: null })).rejects
      .toThrow();
  });
});
