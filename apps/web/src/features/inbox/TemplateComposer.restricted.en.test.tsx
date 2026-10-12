import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PHONE } from './inbox-fixture';
import { InboxModeContext } from './mode';
import { TemplateComposer } from './TemplateComposer';
import { renderWithClient, routeFetch } from './test-utils';

vi.mock('@/lib/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

describe('TemplateComposer — restricted, English', () => {
  it('a teacher with no allowed template reads the English empty note', async () => {
    routeFetch(apiFetch, [['/messaging/templates', []]]);
    renderWithClient(
      <InboxModeContext.Provider value="teacher">
        <TemplateComposer phone={PHONE} context={{}} teacher={false} />
      </InboxModeContext.Provider>,
    );
    expect(await screen.findByText('No templates are available to you yet')).toBeTruthy();
  });
});
