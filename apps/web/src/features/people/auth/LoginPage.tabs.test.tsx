import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { LoginPage } from './LoginPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', () => ({ apiFetch, apiSend: vi.fn() }));
vi.mock('./sign-in', () => ({ signIn: vi.fn(), signInWithCode: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LoginPage />
    </QueryClientProvider>,
  );
}

const tab = (name: string) => screen.getByRole('tab', { name });

describe('LoginPage tabs (docs/30 §7)', () => {
  beforeEach(() => apiFetch.mockResolvedValue({ available: true }));

  it('«فريق الأكاديمية» is the default; only its panel is rendered', () => {
    renderPage();
    expect(screen.getByRole('tablist', { name: t.familyAuth.tabs.label })).toBeTruthy();
    expect(tab(t.familyAuth.tabs.staff).getAttribute('aria-selected')).toBe('true');
    expect(tab(t.familyAuth.tabs.family).getAttribute('aria-selected')).toBe('false');
    const panel = screen.getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(tab(t.familyAuth.tabs.staff).id);
    expect(screen.getByLabelText(t.auth.email).getAttribute('type')).toBe('text');
    expect(screen.getByLabelText(t.auth.email).getAttribute('autocomplete')).toBe('username');
    expect(screen.queryByLabelText(t.familyAuth.phone)).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('clicking «الأسرة والطلاب» shows the phone form instead', async () => {
    renderPage();
    fireEvent.click(tab(t.familyAuth.tabs.family));
    expect(tab(t.familyAuth.tabs.family).getAttribute('aria-selected')).toBe('true');
    const phone = await screen.findByLabelText(t.familyAuth.phone);
    expect(phone.getAttribute('type')).toBe('tel');
    expect(phone.getAttribute('autocomplete')).toBe('tel');
    expect(screen.queryByLabelText(t.auth.email)).toBeNull();
    expect(screen.queryByText(t.auth.guardiansNote)).toBeNull();
  });

  it('arrow keys move between the tabs in reading order (RTL: left = next)', () => {
    renderPage();
    const staff = tab(t.familyAuth.tabs.staff);
    staff.focus();
    fireEvent.keyDown(staff, { key: 'ArrowLeft' });
    const family = tab(t.familyAuth.tabs.family);
    expect(family.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(family);
    fireEvent.keyDown(family, { key: 'ArrowRight' });
    expect(tab(t.familyAuth.tabs.staff).getAttribute('aria-selected')).toBe('true');
  });
});
