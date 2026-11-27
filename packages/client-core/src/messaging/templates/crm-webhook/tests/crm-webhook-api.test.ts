import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { crmWebhookCalls } from '../crm-webhook-api';

const ANSWER = {
  data: { id: 'w-1', url: 'https://api.test.example/webhooks/wacrm', events: [], replaced: 2 },
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('crm webhook calls', () => {
  it('posts the registration on the path of today, with no body', async () => {
    const { client, apiSend } = clientAnswering(ANSWER);
    await expect(crmWebhookCalls(client).register()).resolves.toEqual(ANSWER);
    expect(apiSend.mock.calls).toEqual([['POST', '/settings/integrations/crm-webhook', undefined]]);
  });

  it('refuses an answer without its endpoint', async () => {
    const { client } = clientAnswering({ data: null });
    await expect(crmWebhookCalls(client).register()).rejects.toBeInstanceOf(ApiError);
  });
});
