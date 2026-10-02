import { LOCALE_STORAGE_KEY } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { LanguageSwitch } from './LanguageSwitch';

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('LanguageSwitch (no saved choice: Arabic UI)', () => {
  it('offers English by its own name, named «اللغة» for assistive tech', () => {
    render(<LanguageSwitch />);
    const button = screen.getByRole('button', { name: `${t.language.label} ${t.language.en}` });
    expect(button.querySelector('[lang="en"]')?.textContent).toBe(t.language.en);
  });

  it('saves English and reloads', () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...location, reload });
    render(<LanguageSwitch />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.language.label) }));
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
    expect(reload).toHaveBeenCalledOnce();
  });
});
