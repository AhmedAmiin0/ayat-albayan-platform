import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PHONE } from './inbox-fixture';
import { InboxModeContext } from './mode';
import { NewChatForm } from './NewChatForm';
import { NewThread } from './NewThread';
import { renderWithClient, routeFetch } from './test-utils';

vi.mock('@/lib/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

describe('starting a conversation, English', () => {
  it('the new chat form and the first-template note read in English', async () => {
    routeFetch(apiFetch, [['/messaging/templates', []]]);
    renderWithClient(
      <InboxModeContext.Provider value="sales">
        <NewChatForm onOpen={() => undefined} />
        <NewThread phone={PHONE} lessons={[]} />
      </InboxModeContext.Provider>,
    );
    expect(screen.getByRole('button', { name: 'Open the chat' })).toBeTruthy();
    expect(screen.getByText(en.inbox.newChat.firstTemplate)).toBeTruthy();
    expect(await screen.findByText(en.inbox.composer.noAllowed)).toBeTruthy(); // sales: nothing on the allow-list yet
  });
});
