import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { AppearancePage } from './AppearancePage';

vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/inbox/test-utils')).MockLink,
}));

describe('«المظهر» page', () => {
  it('its title and the theme row, unchanged', () => {
    render(<AppearancePage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(t.settings.sections.appearance);
    expect(screen.getByText(t.settings.theme)).toBeTruthy();
    expect(screen.getByText(t.settings.themeHint)).toBeTruthy();
  });
});
