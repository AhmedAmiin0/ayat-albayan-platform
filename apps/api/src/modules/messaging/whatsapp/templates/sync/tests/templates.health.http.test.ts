import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { whatsappApp } from '@/modules/messaging/whatsapp/test-app';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';

// POST /messaging/templates/health: the line from the body, else from the query (docs/36 Z-1).

type App = Awaited<ReturnType<typeof whatsappApp>>;
const URL_ = '/messaging/templates/health';
const linesOf = (res: { json: () => { lines: { line: string }[] } }) =>
  res.json().lines.map((l) => l.line);

describe('POST /messaging/templates/health inputs', () => {
  let t: App;
  beforeAll(async () => {
    t = await whatsappApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.client.configured.mockReturnValue(true);
    t.chatClient.configured.mockReturnValue(true);
    t.client.getTemplates.mockResolvedValue([]);
    t.chatClient.getTemplates.mockResolvedValue([]);
    t.templates.all.mockResolvedValue([templateRow()]);
  });

  it('no body and no query: every configured line', async () => {
    const res = await t.call({ method: 'POST', url: URL_ });
    expect([res.statusCode, linesOf(res)]).toEqual([200, ['notifications', 'chat']]);
  });

  it('the body line wins over the query line', async () => {
    const res = await t.call({ method: 'POST', url: `${URL_}?line=notifications`, body: { line: 'chat' } });
    expect([res.statusCode, linesOf(res)]).toEqual([200, ['chat']]);
  });

  it('an unknown query line is the 400 validation envelope', async () => {
    const res = await t.call({ method: 'POST', url: `${URL_}?line=sms` });
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    expect(t.client.getTemplates).not.toHaveBeenCalled();
  });
});
