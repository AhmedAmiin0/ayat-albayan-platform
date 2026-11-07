import type { LineCheckView } from '@ab/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import type { NumbersRepo } from '@/modules/messaging/numbers/numbers.repo';
import { healthTarget } from './numbers.health-target';
import { NumbersHealth } from './numbers.health';

// A crm line's «افحص الخطوط» (GET /me, no phone id) is kept on its role's crm number (owner
// 2026-11-07:
// «فشل آخر فحص» stuck since 25 Oct because a crm check had no phone id to be written under).

const crmView = (over: Partial<LineCheckView> = {}): LineCheckView => ({
  line: 'notifications',
  configured: true,
  provider: 'crm',
  gaps: [],
  duplicate_chat_phone: false,
  phone_number_id: null,
  waba_id: null,
  app_id: null,
  display_phone_number: null,
  verified_name: null,
  quality_rating: null,
  status: null,
  name_status: null,
  code_verification_status: null,
  subscribed_apps: null,
  errors: [],
  checked_at: '2026-11-07T08:00:00Z',
  crm_send_scope: true,
  crm_template_scopes_missing: [],
  ...over,
});
const save = async (views: LineCheckView[]) => {
  const saveHealth = vi.fn(async () => undefined);
  await new NumbersHealth({ saveHealth } as unknown as NumbersRepo).save(views);
  return saveHealth;
};
const kept = (ok: boolean, errors = 0) =>
  expect.objectContaining({
    checked_at: '2026-11-07T08:00:00Z',
    health: expect.objectContaining({ ok, errors }),
  });

describe('NumbersHealth: a crm line', () => {
  afterEach(() => setNumbersOverlay(null));

  it('legacy: GET /me answered → «سليم» on the role’s crm rows', async () => {
    const saveHealth = await save([crmView()]);
    expect(saveHealth).toHaveBeenCalledWith(
      { purpose: 'notifications', provider: 'crm' },
      kept(true),
    );
  });

  it('module mode: only the number the role routes to', async () => {
    setNumbersOverlay({ values: {}, numberIds: { chat: 'n-crm' }, numbers: [] });
    const saveHealth = await save([crmView({ line: 'chat' })]);
    expect(saveHealth).toHaveBeenCalledWith(
      { purpose: 'chat', provider: 'crm', id: 'n-crm' },
      kept(true),
    );
  });

  it('a refused key, or a key without messages:send, is a failed check', async () => {
    const refused = crmView({
      errors: [{ step: 'crm_me', code: null, message: '401' }],
      crm_send_scope: null,
    });
    expect(await save([refused])).toHaveBeenCalledWith(expect.anything(), kept(false, 1));
    expect(await save([crmView({ crm_send_scope: false })])).toHaveBeenCalledWith(
      expect.anything(),
      kept(false),
    );
  });

  it('an unconfigured line keeps nothing; Meta and Evolution lines their phone id', () => {
    expect(healthTarget(crmView({ configured: false }), undefined)).toBeNull();
    const evolution = crmView({ provider: 'evolution', phone_number_id: 'inst' });
    expect(healthTarget(evolution, 'x')).toEqual({ phone_number_id: 'inst' });
    expect(healthTarget(crmView({ provider: 'meta', phone_number_id: '1' }), 'x')).toEqual({
      phone_number_id: '1',
    });
  });
});
