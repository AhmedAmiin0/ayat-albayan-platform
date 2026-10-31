import { afterEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay, type OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import { loadEnv } from '@/config/env/env';
import { envelope, inboundValue, PHONE_NUMBER_ID, statusValue, textPart } from './meta.fakes';
import { liveWebhookConfig, signatureSecrets } from './webhook.config';
import { receivingNumber } from './lines/webhook.lines';
import { parseWebhook } from './parse/webhook.parse';

// Module mode inbound (docs/23c decision 7): any number row stamps its id and purpose; legacy unchanged.

const NOW = new Date('2026-10-24T10:00:00Z');
const number = (over: Partial<OverlayNumber>): OverlayNumber => ({
  id: 'n-id',
  label: 'x',
  purpose: 'chat',
  phone_number_id: 'pid',
  waba_id: null,
  enabled: true,
  is_default: false,
  fallback_rank: 100,
  created_at: '2026-10-01T00:00:00Z',
  env: null,
  appSecret: null,
  ...over,
});
const SALES2 = number({ id: 'num-sales-2', phone_number_id: 'pid-sales-2', appSecret: 'sales2-secret-fake' });
const OFF = number({ id: 'num-off', purpose: 'notifications', phone_number_id: 'pid-off', enabled: false, appSecret: ' ' });
const NUMBERS = [SALES2, OFF];

afterEach(() => {
  setNumbersOverlay(null);
  vi.unstubAllEnvs();
});

describe('receivingNumber', () => {
  it('a non-default and a disabled number stamp their id and purpose; unknown → null; no id → unstamped', () => {
    expect(receivingNumber(NUMBERS, 'pid-sales-2')).toEqual({ line: 'chat', numberId: 'num-sales-2' });
    expect(receivingNumber(NUMBERS, 'pid-off')).toEqual({ line: 'notifications', numberId: 'num-off' });
    expect(receivingNumber(NUMBERS, 'someone-else')).toBeNull();
    // No number row at all: kept unstamped, never dropped (Meta never retries a 200).
    expect(receivingNumber([], 'pid-off')).toEqual({ line: null });
    expect(receivingNumber(NUMBERS, undefined)).toEqual({ line: null });
  });
});

describe('parseWebhook in module mode', () => {
  const body = (pid: string) => envelope(inboundValue(textPart('سلام')), pid);

  it('stamps numberId + line from the overlay, ignoring the legacy line ids', () => {
    const batch = parseWebhook(body('pid-off'), { now: NOW, numbers: { notifications: 'pid-sales-2' }, overlay: NUMBERS });
    expect(batch.messages[0]).toMatchObject({ line: 'notifications', numberId: 'num-off' });
  });

  it('an unknown id is ignored (reported once per change) with its statuses', () => {
    const onIgnored = vi.fn();
    const raw = envelope({ ...inboundValue(textPart('x')), ...{ statuses: [] } }, 'other');
    const batch = parseWebhook(raw, { now: NOW, overlay: NUMBERS, onIgnored });
    expect(batch).toEqual({ messages: [], statuses: [], echoes: [] });
    expect(onIgnored).toHaveBeenCalledWith('other');
  });

  it('status updates of a known number pass through unchanged', () => {
    const batch = parseWebhook(envelope(statusValue({ status: 'read' }), 'pid-sales-2'), { now: NOW, overlay: NUMBERS });
    expect(batch.statuses).toEqual([expect.objectContaining({ waMessageId: 'wamid.OUT1', status: 'read' })]);
  });

  it('legacy (overlay null / absent): no numberId key at all', () => {
    const batch = parseWebhook(body(PHONE_NUMBER_ID), { now: NOW, numbers: { notifications: PHONE_NUMBER_ID }, overlay: null });
    expect(batch.messages[0]).not.toHaveProperty('numberId');
    expect(batch.messages[0]?.line).toBeNull();
  });
});

describe('signature secrets', () => {
  const env = () => loadEnv({ SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k', WA_APP_SECRET: 'legacy-secret-fake' });

  it('legacy: exactly appSecrets(env)', () => {
    expect(signatureSecrets(env(), null)).toEqual(['legacy-secret-fake']);
  });

  it('module: adds every number\'s non-blank secret, distinct', () => {
    const e = { ...env(), WA_APP_SECRET: undefined };
    expect(signatureSecrets(e, [...NUMBERS, number({ id: 'dup', appSecret: 'sales2-secret-fake' })])).toEqual(['sales2-secret-fake']);
  });

  it('liveWebhookConfig reads the overlay per access; legacy has no overlay', () => {
    vi.stubEnv('SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'k');
    vi.stubEnv('WA_APP_SECRET', 'legacy-secret-fake');
    const config = liveWebhookConfig(() => loadEnv());
    expect(config.overlay).toBeNull();
    expect(config.appSecrets).toEqual(['legacy-secret-fake']);
    setNumbersOverlay({ values: { WA_APP_SECRET: '', WA_CHAT_APP_SECRET: '' }, numberIds: {}, numbers: NUMBERS });
    expect(config.overlay?.map((n) => n.id)).toEqual(['num-sales-2', 'num-off']);
    expect(config.appSecrets).toEqual(['sales2-secret-fake']);
  });
});
