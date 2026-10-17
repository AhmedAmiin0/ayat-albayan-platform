import { createServer } from 'node:http';
import type { ChatLineOptions } from './state.ts';
import { createStub } from './stub.ts';

// Local/e2e only: WhatsappClient talks to this through WA_API_BASE, never to graph.facebook.com.
const env = (key: string): string | undefined => process.env[key] || undefined;
const port = Number(env('WA_STUB_PORT') ?? 4010);

/** The chat identity exists ONLY when WA_CHAT_PHONE_NUMBER_ID is set (docs/12 §13.12). */
function chatLine(): ChatLineOptions | undefined {
  const phoneNumberId = env('WA_CHAT_PHONE_NUMBER_ID');
  if (!phoneNumberId) return undefined;
  return {
    phoneNumberId,
    wabaId: env('WA_CHAT_WABA_ID'),
    accessToken: env('WA_CHAT_ACCESS_TOKEN'),
    appSecret: env('WA_CHAT_APP_SECRET'),
    appId: env('WA_CHAT_APP_ID'),
  };
}

/** Kapso's Meta proxy under /kapso (docs/19); fake values only, never a real project key. */
const kapso = {
  ...(env('KAPSO_API_KEY') ? { apiKey: env('KAPSO_API_KEY') } : {}),
  ...(env('WA_KAPSO_WEBHOOK_URL') ? { webhookUrl: env('WA_KAPSO_WEBHOOK_URL') } : {}),
  ...(env('KAPSO_WEBHOOK_SECRET') ? { webhookSecret: env('KAPSO_WEBHOOK_SECRET') } : {}),
};

const chat = chatLine();
const stub = createStub({
  webhookUrl: env('WA_WEBHOOK_URL') ?? 'http://localhost:3000/webhooks/whatsapp',
  appSecret: env('WA_APP_SECRET') ?? 'local-app-secret',
  phoneNumberId: env('WA_PHONE_NUMBER_ID') ?? 'stub-phone',
  ...(env('WA_ACCESS_TOKEN') ? { accessToken: env('WA_ACCESS_TOKEN') } : {}),
  ...(env('WA_WABA_ID') ? { wabaId: env('WA_WABA_ID') } : {}),
  ...(env('WA_APP_ID') ? { appId: env('WA_APP_ID') } : {}),
  ...(chat ? { chat } : {}),
  kapso,
});

createServer((req, res) => {
  stub.handle(req, res).catch((err: unknown) => {
    res.writeHead(500).end(String(err));
  });
}).listen(port, () => console.log(`wa-stub listening on :${port}`));
