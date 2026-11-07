import { afterEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay, type OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import { syncLine } from '@/modules/messaging/whatsapp/templates/sync/template-line-sync';
import type { MetaTemplate, WhatsappLines } from '@/modules/messaging/whatsapp/whatsapp.types';
import type { TemplateRegistry } from '@/modules/messaging/whatsapp/templates/catalog/template.registry';
import type { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { TemplateVerifier } from '@/modules/messaging/whatsapp/templates/sync/template-verifier';
import type { CrmCopiesRepo } from './crm-copies.repo';
import { CrmCopyRefresh } from './crm-copy-refresh.job';
import { sentOnCrm } from './crm-sent-template';

// The copy fills without anyone pressing «مزامنة»: the daily job, and the crm line's own sync.

const NOW = new Date('2026-11-07T08:00:00Z');
const LIST: MetaTemplate[] = [];
const client = (configured: boolean, getTemplates = vi.fn(async () => LIST)) =>
  ({ configured: () => configured, getTemplates });
type Client = ReturnType<typeof client>;
const lines = (n: Client, c = client(false)) =>
  ({ notifications: n, chat: c }) as unknown as WhatsappLines;
const copies = () => ({ save: vi.fn(async () => 0) });

afterEach(() => {
  vi.unstubAllEnvs();
  setNumbersOverlay(null);
});

const verifier = (n: Client, c: ReturnType<typeof copies>) => {
  const queries = {} as unknown as TemplatesRepo;
  const catalog = {} as unknown as TemplateRegistry;
  return new TemplateVerifier(queries, lines(n), catalog, c as unknown as CrmCopiesRepo);
};

describe('CrmCopyRefresh', () => {
  it('one GET per configured crm line, saved', async () => {
    vi.stubEnv('WA_PROVIDER', 'crm');
    const n = client(true);
    const c = copies();
    expect(await new CrmCopyRefresh(verifier(n, c)).runOnce(NOW)).toEqual(['notifications']);
    expect(n.getTemplates).toHaveBeenCalledTimes(1);
    expect(c.save).toHaveBeenCalledWith(LIST, NOW);
  });

  it('a meta line is never read; a failed read is logged, never thrown', async () => {
    vi.stubEnv('WA_PROVIDER', 'meta');
    const n = client(true);
    expect(await new CrmCopyRefresh(verifier(n, copies())).runOnce(NOW)).toEqual([]);
    expect(n.getTemplates).not.toHaveBeenCalled();
    vi.stubEnv('WA_PROVIDER', 'crm');
    const failing = client(true, vi.fn(async () => Promise.reject(new Error('down'))));
    await expect(new CrmCopyRefresh(verifier(failing, copies())).runOnce(NOW)).resolves.toEqual([]);
  });
});

describe('syncLine on a crm line («مزامنة», the boot check)', () => {
  it('keeps the CRM list as our copy; a meta line keeps none', async () => {
    const queries = { all: vi.fn(async () => []), update: vi.fn(), insert: vi.fn() };
    const log = { warn: vi.fn() };
    vi.stubEnv('WA_PROVIDER', 'crm');
    const c = copies();
    await syncLine({ queries, lines: lines(client(true)), log, copies: c }, 'notifications', NOW);
    expect(c.save).toHaveBeenCalledWith(LIST, NOW);
    vi.stubEnv('WA_PROVIDER', 'meta');
    const m = copies();
    await syncLine({ queries, lines: lines(client(true)), log, copies: m }, 'notifications', NOW);
    expect(m.save).not.toHaveBeenCalled();
  });
});

describe('sentOnCrm', () => {
  it('module mode: the row\'s number decides, whatever the line env says', () => {
    vi.stubEnv('WA_PROVIDER', 'meta');
    const crm = { id: 'n1', env: { provider: 'crm' } } as unknown as OverlayNumber;
    setNumbersOverlay({ values: {}, numberIds: {}, numbers: [crm] });
    expect(sentOnCrm({ number_id: 'n1', line: 'notifications' })).toBe(true);
    expect(sentOnCrm({ number_id: null, line: 'notifications' })).toBe(false);
    expect(sentOnCrm({ number_id: 'gone', line: 'chat' })).toBe(false);
  });
});
