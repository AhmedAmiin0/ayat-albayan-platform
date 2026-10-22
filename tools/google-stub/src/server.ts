import { createServer } from 'node:http';
import { createStub } from './stub.ts';

// Local/e2e only: the API reaches this through GOOGLE_API_BASE, never accounts.google.com.
const port = Number(process.env['GOOGLE_STUB_PORT'] || 4120);
const stub = createStub();

createServer((req, res) => {
  stub.handle(req, res).catch((err: unknown) => res.writeHead(500).end(String(err)));
}).listen(port, () => console.log(`google-stub listening on :${port}`));
