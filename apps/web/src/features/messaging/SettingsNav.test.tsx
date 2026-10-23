import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { sectionId, SETTINGS_SECTIONS, SettingsNav } from './SettingsNav';

describe('SettingsNav (/admin/settings section index)', () => {
  it('lists the registry sections in page order, the first one current', () => {
    render(<SettingsNav />);
    const nav = screen.getByRole('navigation', { name: t.settings.nav });
    const links = within(nav).getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(SETTINGS_SECTIONS.map((s) => t.settings.sections[s]));
    expect(links[0]?.getAttribute('aria-current')).toBe('true');
    expect(links[2]?.getAttribute('href')).toBe(`#${sectionId('classroom')}`);
  });

  it('jumps to a section inside the page and marks it current', () => {
    const target = document.createElement('section');
    target.id = sectionId('accounts');
    const scroll = vi.fn();
    target.scrollIntoView = scroll;
    document.body.append(target);
    render(<SettingsNav />);
    const link = screen.getByRole('link', { name: t.settings.sections.accounts });
    fireEvent.click(link);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(link.getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('link', { name: t.settings.sections.messaging }).getAttribute('aria-current')).toBeNull();
    target.remove();
  });
});
