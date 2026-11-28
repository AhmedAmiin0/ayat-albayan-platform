import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { whatsappApp } from '@/modules/messaging/whatsapp/test-app';

// docs/36 Z-1: a template route's :key is parsed by templateKeyParam, as PATCH :key/content is.

type App = Awaited<ReturnType<typeof whatsappApp>>;
const BAD = '/messaging/templates/Not-A-Key';

const ROUTES = [
  ['POST', 'submit', undefined],
  ['PATCH', 'line', { line: 'chat' }],
  ['PUT', 'number', { number_id: null }],
  ['PUT', 'crm-status', { status: 'approved' }],
  ['PUT', 'crm-name', { crm_name: null, crm_language: null }],
  ['PATCH', 'starter', { sales_starter: true }],
] as const;

describe('template edits with a key that is not a template key', () => {
  let t: App;
  beforeAll(async () => {
    t = await whatsappApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.resetAllMocks());

  it.each(ROUTES)('%s …/:key/%s → 400 validation_failed, nothing read', async (method, path, body) => {
    const res = await t.call({ method, url: `${BAD}/${path}`, body });
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    expect(t.templates.get).not.toHaveBeenCalled();
  });
});
