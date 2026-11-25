import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PARITY_DIFF } from '@/features/messaging/numbers/numbers.fixture';
import { renderPanel } from '@/features/messaging/numbers/numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@ab/web-kit/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

const s = t.numbers.source;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('the source switch while differences remain', () => {
  it('shows the current source; «التحويل إلى الأرقام» is disabled and says why', async () => {
    renderPanel(apiFetch, { parity: PARITY_DIFF });
    const toModule = await screen.findByRole<HTMLButtonElement>('button', { name: s.toModule });
    expect(screen.getByText(s.current.replace('{{source}}', s.legacy))).toBeTruthy();
    expect(toModule.disabled).toBe(true);
    expect(screen.getByText(s.blocked)).toBeTruthy();
    fireEvent.click(toModule);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('back to the current setup is always offered in module mode', async () => {
    renderPanel(apiFetch, { parity: { ...PARITY_DIFF, source: 'module' } });
    const back = await screen.findByRole<HTMLButtonElement>('button', { name: s.toLegacy });
    expect(back.disabled).toBe(false);
    expect(screen.queryByText(s.blocked)).toBeNull();
    expect(screen.queryByRole('button', { name: s.toModule })).toBeNull();
  });
});
