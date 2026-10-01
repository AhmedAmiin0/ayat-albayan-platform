import { createServer } from 'node:http';
import { createStub } from './stub.ts';

const port = Number(process.env['WA_STUB_PORT'] ?? 4010);
const stub = createStub({
  webhookUrl: process.env['WA_WEBHOOK_URL'] ?? 'http://localhost:3000/webhooks/whatsapp',
  appSecret: process.env['WA_APP_SECRET'] ?? 'local-app-secret',
});

createServer((req, res) => {
  stub.handle(req, res).catch((err: unknown) => {
    res.writeHead(500).end(String(err));
  });
}).listen(port, () => console.log(`wa-stub listening on :${port}`));
