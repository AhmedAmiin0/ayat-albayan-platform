import { EVOLUTION_DEFAULT_EVENTS, evolutionConfigSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { checkConfig } from './config-check';
import { draftOfConfig, patchSection } from './config-draft';

const c = t.numbers.evolution.config;
const DEFAULTS = evolutionConfigSchema.parse({});
const fresh = () => draftOfConfig(DEFAULTS);

describe('«إعدادات Evolution» draft', () => {
  it('starts from the saved options: gap 3000, cap 60, 3 errors, default events, webhook on', () => {
    const draft = fresh();
    expect(draft.limits).toEqual({ gap_ms: '3000', daily_cap: '60', error_trip: '3' });
    expect(draft.webhook).toEqual({ enabled: true, origin: 'internal', events: [...EVOLUTION_DEFAULT_EVENTS] });
    expect(draft.proxy.port).toBe('');
    expect(draft.behaviour.groups_ignore).toBe(true);
  });
});

describe('checkConfig (evolutionConfigSchema)', () => {
  it('the untouched draft is the defaults', () => {
    expect(checkConfig(fresh(), 'baileys')).toEqual({ config: DEFAULTS, errors: null });
  });

  it('the webhook has no URL to type: the origin goes as chosen', () => {
    const pub = patchSection(fresh(), 'webhook', { origin: 'public' });
    expect(checkConfig(pub, 'baileys').config?.webhook).toMatchObject({ origin: 'public', enabled: true });
  });

  it('a Cloud instance needs both Meta ids', () => {
    expect(checkConfig(fresh(), 'cloud').errors).toEqual({
      'cloud.phone_number_id': c.errors.cloud_needed, 'cloud.business_id': c.errors.cloud_needed,
    });
    const ids = patchSection(fresh(), 'cloud', { phone_number_id: '111', business_id: '222' });
    expect(checkConfig(ids, 'cloud').config?.cloud).toEqual({ phone_number_id: '111', business_id: '222' });
  });

  it('a proxy that is on needs its host and port; the port goes as a number', () => {
    const on = patchSection(fresh(), 'proxy', { enabled: true });
    expect(checkConfig(on, 'baileys').errors).toEqual({ 'proxy.host': c.errors.proxy_needed });
    const bad = patchSection(on, 'proxy', { host: 'http://x', port: '8080' });
    expect(checkConfig(bad, 'baileys').errors?.['proxy.host']).toBe(c.errors.proxy_host);
    const good = patchSection(on, 'proxy', { host: '10.0.0.5', port: '8080' });
    expect(checkConfig(good, 'baileys').config?.proxy).toMatchObject({ host: '10.0.0.5', port: 8080 });
  });

  it('an emptied or out-of-range number, no event or a non-digit id is refused', () => {
    const draft = patchSection(fresh(), 'limits', { gap_ms: '', daily_cap: '0' });
    const errors = checkConfig(patchSection(draft, 'cloud', { business_id: 'abc' }), 'baileys').errors;
    expect(errors).toEqual({
      'limits.gap_ms': c.errors.invalid,
      'limits.daily_cap': c.errors.invalid,
      'cloud.business_id': c.errors.invalid_id,
    });
    const none = patchSection(fresh(), 'webhook', { events: [] });
    expect(checkConfig(none, 'baileys').errors).toEqual({ 'webhook.events': c.errors.invalid });
    const sent = checkConfig(patchSection(fresh(), 'sending', { link_preview: true }), 'baileys');
    expect(sent.config?.sending).toEqual({ link_preview: true });
  });
});
