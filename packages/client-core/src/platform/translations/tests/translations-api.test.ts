import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { translationCalls } from '../translations-api';

const ROW = {
  key: 'nav.leads',
  section: 'nav',
  ar: 'العملاء',
  en: 'Leads',
  arOverride: null,
  enOverride: null,
};
const PAGE = { items: [ROW], total: 1, page: 2, pageSize: 50, sections: ['nav'] };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('translation calls', () => {
  it('reads one page of keys with its filters on the path of today', async () => {
    const { client, apiFetch } = clientAnswering(PAGE);
    const query = { page: 2, pageSize: 50, search: 'leads', section: 'nav' };
    await expect(translationCalls(client).keys(query)).resolves.toEqual(PAGE);
    expect(apiFetch.mock.calls).toEqual([
      ['/i18n/keys?page=2&pageSize=50&search=leads&section=nav'],
    ]);
  });

  it('refuses a page whose row has no defaults', async () => {
    const { client } = clientAnswering({ ...PAGE, items: [{ key: 'nav.leads' }] });
    await expect(translationCalls(client).keys({ page: 1 })).rejects.toBeInstanceOf(ApiError);
  });

  it('saves and restores one override, the key encoded in the path', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    const calls = translationCalls(client);
    await calls.save({ locale: 'en', key: 'a/b' }, { value: 'Prospects' });
    await calls.restore({ locale: 'ar', key: 'nav.leads' });
    expect(apiSend.mock.calls).toEqual([
      ['PUT', '/i18n/en/a%2Fb', { value: 'Prospects' }],
      ['DELETE', '/i18n/ar/nav.leads', undefined],
    ]);
  });
});
