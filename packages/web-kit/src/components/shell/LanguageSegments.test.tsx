import { LOCALE_STORAGE_KEY } from '@ab/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { LanguageSegments } from './LanguageSegments';

vi.mock('@ab/web-kit/lib/http/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('LanguageSegments (no saved choice: Arabic UI)', () => {
  it('both languages by their own names, lang-tagged, the current one pressed', () => {
    render(<LanguageSegments pill />);
    expect(screen.getByRole('group', { name: t.language.label })).toBeTruthy();
    const ar = screen.getByRole('button', { name: t.language.ar });
    const en = screen.getByRole('button', { name: t.language.en });
    expect([ar.getAttribute('aria-pressed'), ar.getAttribute('lang')]).toEqual(['true', 'ar']);
    expect([en.getAttribute('aria-pressed'), en.getAttribute('lang')]).toEqual(['false', 'en']);
    expect(ar.className).toContain('rounded-full');
  });

  it('the other language saves and reloads; the current one does nothing', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    render(<LanguageSegments />);
    fireEvent.click(screen.getByRole('button', { name: t.language.ar }));
    fireEvent.click(screen.getByRole('button', { name: t.language.en }));
    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
  });
});
