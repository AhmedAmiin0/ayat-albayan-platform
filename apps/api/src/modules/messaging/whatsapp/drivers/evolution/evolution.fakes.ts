import type { EvolutionLineEnv } from '@/config/env/env';
import { EvolutionPacer } from './evolution-pacer';

// Test-only (excluded from the build): an Evolution number pointed at a fake host, and Evolution
// API v2's answers (docs/19 «Evolution driver»). Ids, names and tokens invented.

export const EVO_BAILEYS: EvolutionLineEnv = {
  provider: 'evolution',
  base: 'https://evo.example.test',
  instance: 'secondary-1',
  token: 'fake-instance-token',
  mode: 'baileys',
  autoSends: false,
  gapMs: 3_000,
  dailyCap: 60,
  delayMs: 0,
  linkPreview: false,
};

export const EVO_CLOUD: EvolutionLineEnv = { ...EVO_BAILEYS, mode: 'cloud', instance: 'cloud-1' };

/** A send's 201: the stored message. */
export const evoSent = (id = 'EVO-MSG-1') => ({
  status: 201,
  body: { key: { id, remoteJid: '966500000001@s.whatsapp.net', fromMe: true }, status: 'PENDING' },
});

/** Evolution's error envelope (src/main.ts). */
export const evoFailure = (status: number, message: unknown) => ({
  status,
  body: { status, error: 'Error', response: { message } },
});

/** A pacer whose clock stands still (its own tests move the clock). */
export const noWait = () => new EvolutionPacer({ now: () => 0 });
