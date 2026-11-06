import { EVOLUTION_DEFAULT_EVENTS, evolutionConfigSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { checkConfig } from './config-check';
import { draftOfConfig, patchSection, suggestedHookUrl, toggleHook } from './config-draft';

const c = t.numbers.evolution.config;
const DEFAULTS = evolutionConfigSchema.parse({});
const HOOK = 'https://api.academy.test/webhooks/evolution/academy-staff';
const fresh = () => draftOfConfig(DEFAULTS, HOOK);

describe('«إعدادات Evolution» draft', () => {
  it('starts from the saved options: gap 3000, cap 60, the default events, webhook off', () => {
    const draft = fresh();
    expect(draft.limits).toEqual({ gap_ms: '3000', daily_cap: '60' });
    expect(draft.webhook.events).toEqual([...EVOLUTION_DEFAULT_EVENTS]);
    expect(draft.webhook.enabled).toBe(false);
    expect(draft.webhook.url).toBe('');
    expect(draft.proxy.port).toBe('');
    expect(draft.behaviour.groups_ignore).toBe(true);
  });

  it('the suggested URL is our path on the API, offered only for an empty, enabled webhook', () => {
    expect(suggestedHookUrl('https://api.academy.test/', 'academy-staff')).toBe(HOOK);
    const on = { ...DEFAULTS, webhook: { ...DEFAULTS.webhook, enabled: true } };
    expect(draftOfConfig(on, HOOK).webhook.url).toBe(HOOK);
    const saved = { ...on, webhook: { ...on.webhook, url: 'https://other.test/x' } };
    expect(draftOfConfig(saved, HOOK).webhook.url).toBe('https://other.test/x');
  });

  it('turning the webhook on fills an empty URL only', () => {
    const draft = fresh();
    expect(toggleHook(draft.webhook, HOOK)).toEqual({ enabled: true, url: HOOK });
    const typed = { ...draft.webhook, url: 'https://mine.test/hook' };
    expect(toggleHook(typed, HOOK)).toEqual({ enabled: true, url: 'https://mine.test/hook' });
    const off = toggleHook({ ...typed, enabled: true }, HOOK);
    expect(off).toEqual({ enabled: false, url: typed.url });
  });
});

describe('checkConfig (evolutionConfigSchema)', () => {
  it('the untouched draft is the defaults', () => {
    expect(checkConfig(fresh())).toEqual({ config: DEFAULTS, errors: null });
  });

  it('a webhook that is on needs a valid URL', () => {
    const on = patchSection(fresh(), 'webhook', { enabled: true });
    expect(checkConfig(on).errors).toEqual({ 'webhook.url': c.errors.webhook_url });
    const bad = patchSection(on, 'webhook', { url: 'ftp://x.test/hook' });
    expect(checkConfig(bad).errors?.['webhook.url']).toBe(c.errors.webhook_url);
    const good = patchSection(on, 'webhook', { url: HOOK });
    expect(checkConfig(good).config?.webhook.url).toBe(HOOK);
  });

  it('a proxy that is on needs its host and port; the port goes as a number', () => {
    const on = patchSection(fresh(), 'proxy', { enabled: true });
    expect(checkConfig(on).errors).toEqual({ 'proxy.host': c.errors.proxy_needed });
    const bad = patchSection(on, 'proxy', { host: 'http://x', port: '8080' });
    expect(checkConfig(bad).errors?.['proxy.host']).toBe(c.errors.proxy_host);
    const good = patchSection(on, 'proxy', { host: '10.0.0.5', port: '8080' });
    expect(checkConfig(good).config?.proxy).toMatchObject({ host: '10.0.0.5', port: 8080 });
  });

  it('an emptied or out-of-range number, no event or a non-digit id is refused', () => {
    const draft = patchSection(fresh(), 'limits', { gap_ms: '', daily_cap: '0' });
    const errors = checkConfig(patchSection(draft, 'cloud', { business_id: 'abc' })).errors;
    expect(errors).toEqual({
      'limits.gap_ms': c.errors.invalid,
      'limits.daily_cap': c.errors.invalid,
      'cloud.business_id': c.errors.invalid_id,
    });
    const none = patchSection(fresh(), 'webhook', { events: [] });
    expect(checkConfig(none).errors).toEqual({ 'webhook.events': c.errors.invalid });
  });
});
