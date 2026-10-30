import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { STUB_URL } from './core/wa-stub';

// 26-P4 (docs/26 §5): a SECOND API process on its own port, booted from the same build and database as the
// e2e API, then stopped. WhatsApp points at tools/wa-stub only (the e2e credentials); Google, Kapso and the
// currency API at nothing. Used to boot the API twice and check that the send gate stays closed.

const API_DIR = fileURLToPath(new URL('../../apps/api/', import.meta.url));
const BOOT_PORT = 3101;

const BOOT_ENV = {
  PORT: String(BOOT_PORT),
  WA_API_BASE: STUB_URL,
  WA_PHONE_NUMBER_ID: 'e2e-phone',
  WA_WABA_ID: 'e2e-waba',
  WA_ACCESS_TOKEN: 'e2e-token',
  WA_APP_ID: 'e2e-app',
  WA_APP_SECRET: 'e2e-app-secret',
  WA_ALLOWED_RECIPIENTS: '',
  WA_PROVIDER: '',
  WA_CHAT_PROVIDER: '',
  KAPSO_API_BASE: '',
  GOOGLE_API_BASE: 'http://127.0.0.1:9/',
  FX_API_URL: 'http://127.0.0.1:9/',
  WA_TEMPLATE_SYNC: '',
  // A fast sender tick, and the default 30 s settings cache: the gate must not read through it.
  MESSAGE_SENDER_POLL_MS: '300',
  SETTINGS_CACHE_MS: '',
};

/** /health answers while THIS child runs (an orphan on the port cannot pass for it). */
async function healthy(input: { deadline: number; alive: () => boolean }): Promise<void> {
  while (Date.now() < input.deadline) {
    if (!input.alive()) throw new Error('the second API exited during boot');
    const ok = await fetch(`http://localhost:${BOOT_PORT}/health`).then((r) => r.ok, () => false);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`the second API did not answer /health on :${BOOT_PORT}`);
}

/** Boots the API, lets it run `runMs` (sender passes, jobs), then stops it and waits for the exit. */
export async function bootApiOnce(runMs: number): Promise<void> {
  const child = spawn(process.execPath, ['--env-file-if-exists=.env', 'dist/main.js'], {
    cwd: API_DIR,
    env: { ...process.env, ...BOOT_ENV },
    stdio: 'ignore',
  });
  let alive = true;
  const exited = new Promise<void>((resolve) => child.once('exit', () => ((alive = false), resolve())));
  try {
    await healthy({ deadline: Date.now() + 60_000, alive: () => alive });
    await new Promise((r) => setTimeout(r, runMs));
    // Still running after its sender passes: a crash right after /health fails the boot.
    if (!alive) throw new Error('the second API exited while running');
  } finally {
    child.kill('SIGTERM');
    const killer = setTimeout(() => child.kill('SIGKILL'), 10_000);
    await exited;
    clearTimeout(killer);
  }
}
