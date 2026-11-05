import { afterEach, describe, expect, it, vi } from 'vitest';
import { lineSaved } from '@/common/configuration/integrations/provider-saved';
import { templateServices } from './template-services.fakes';

// docs/19 «CRM → Meta»: saving a line as meta syncs its templates once; nothing else does.

afterEach(() => vi.unstubAllEnvs());

function verifier(configured = true) {
  const notifications = { configured: () => configured };
  const lines = { notifications, chat: { configured: () => false } };
  const { verifier: v } = templateServices({}, lines, {});
  const verifyAll = vi.spyOn(v, 'verifyAll').mockResolvedValue({ lines: [], templates: [] });
  return { v, verifyAll };
}

describe('TemplateVerifier.afterSave', () => {
  it('a line saved as meta: one sync of that line', async () => {
    const { v, verifyAll } = verifier();
    await v.afterSave({ line: 'notifications', provider: 'meta' });
    expect(verifyAll).toHaveBeenCalledTimes(1);
    expect(verifyAll).toHaveBeenCalledWith({ line: 'notifications' });
  });

  it('saved as crm or kapso, the line not configured, or the sync off: nothing', async () => {
    const { v, verifyAll } = verifier();
    await v.afterSave({ line: 'notifications', provider: 'crm' });
    await v.afterSave({ line: 'notifications', provider: 'kapso' });
    await verifier(false).v.afterSave({ line: 'notifications', provider: 'meta' });
    vi.stubEnv('WA_TEMPLATE_SYNC', 'false');
    await v.afterSave({ line: 'notifications', provider: 'meta' });
    expect(verifyAll).not.toHaveBeenCalled();
  });

  it('listens from module init until destroy', async () => {
    const { v, verifyAll } = verifier();
    v.onModuleInit();
    lineSaved({ line: 'notifications', provider: 'meta' });
    await vi.waitFor(() => expect(verifyAll).toHaveBeenCalledTimes(1));
    v.onModuleDestroy();
    lineSaved({ line: 'notifications', provider: 'meta' });
    await Promise.resolve();
    expect(verifyAll).toHaveBeenCalledTimes(1);
  });
});
