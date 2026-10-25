import { describe, expect, it } from 'vitest';
import { integrationItems } from './integrations.fixture';
import { t } from '@/lib/i18n/i18n';
import { changesOf, draftOf, enumEmptyLabel, integrationsMatch, invalidKeys } from './integrations-form';

describe('integrations form logic', () => {
  it('the draft holds plain keys only, prefilled with the value in use', () => {
    const draft = draftOf(integrationItems());
    expect(draft.WA_WABA_ID).toBe('db-waba');
    expect(draft.LIVEKIT_URL).toBe('');
    expect('WA_ACCESS_TOKEN' in draft).toBe(false);
  });

  it('changes: trimmed, unchanged keys left out, emptied keys null', () => {
    const items = integrationItems();
    const draft = { ...draftOf(items), WA_WABA_ID: '', WA_APP_ID: ' a1 ', WA_API_BASE: 'http://localhost:4010 ' };
    expect(changesOf(items, draft)).toEqual({ WA_WABA_ID: null, WA_APP_ID: 'a1' });
  });

  it('invalid keys use the shared checks; a clear is always valid', () => {
    expect(invalidKeys({ WA_API_BASE: 'x', FX_API_URL: null, WA_API_VERSION: 'v22.0' })).toEqual(['WA_API_BASE']);
  });

  it('the search matches a label, a hint or the key name', () => {
    expect(integrationsMatch('')).toBe(true);
    expect(integrationsMatch('wa_chat_app_secret')).toBe(true);
    expect(integrationsMatch('LiveKit')).toBe(true);
    expect(integrationsMatch('zzzz-nothing')).toBe(false);
  });

  it('the provider select’s empty choice names what clearing leads to: the server value, else the default', () => {
    const s = t.integrations;
    expect(enumEmptyLabel({ source: 'env', value: 'kapso' }, 'meta')).toBe(s.enumServer.replace('{value}', s.options.kapso));
    expect(enumEmptyLabel({ source: 'unset', value: null }, 'meta')).toBe(s.enumDefault.replace('{value}', s.options.meta));
    expect(enumEmptyLabel({ source: 'db', value: 'kapso' }, 'meta')).toBe(s.enumServerOrDefault.replace('{value}', s.options.meta));
    expect(enumEmptyLabel({ source: 'env', value: 'meta' }, 'meta')).not.toBe(s.enumDefault.replace('{value}', s.options.meta));
  });
});
