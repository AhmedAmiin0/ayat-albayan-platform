import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { SideSheetCloseContext } from '@/features/messaging/inbox/shared/side-sheet';
import { PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ChatSearchBar } from './ChatSearchBar';
import { ChatSearchProvider } from './ChatSearchProvider';
import { SearchFromProfile } from './SearchFromProfile';

vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn() }));

const label = t.inbox.chatSearch.fromProfile;

describe('«بحث في الرسائل» in the contact panel (docs/37 NEW 2)', () => {
  it('opens the chat search bar with the cursor in it and closes the phone sheet', () => {
    const close = vi.fn();
    renderWithClient(
      <ChatSearchProvider phone={PHONE}>
        <ChatSearchBar />
        <SideSheetCloseContext value={close}>
          <SearchFromProfile />
        </SideSheetCloseContext>
      </ChatSearchProvider>,
    );
    expect(screen.queryByRole('search')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: label }));
    const box = screen.getByRole('searchbox', { name: t.inbox.chatSearch.label });
    expect(document.activeElement).toBe(box);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('beside the chat (no sheet) it only opens the bar', () => {
    renderWithClient(
      <ChatSearchProvider phone={PHONE}>
        <ChatSearchBar />
        <SearchFromProfile />
      </ChatSearchProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(screen.getByRole('search')).toBeTruthy();
  });

  it('renders nothing outside a chat', () => {
    renderWithClient(<SearchFromProfile />);
    expect(screen.queryByRole('button', { name: label })).toBeNull();
  });
});
