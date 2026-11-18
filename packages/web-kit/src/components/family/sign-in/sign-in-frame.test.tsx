import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { OrDivider } from './OrDivider';
import { SignInHeader } from './SignInHeader';
import { SignInPanel } from './SignInPanel';

const L = t.familyLook;

describe('the family sign-in frame (boards PortalWebSignIn / PortalPhoneSignIn)', () => {
  it('the header: the academy lockup and nothing to navigate', () => {
    render(<SignInHeader />);
    const header = screen.getByRole('banner');
    expect(header.textContent).toContain(L.brand.name);
    expect(header.textContent).toContain(L.brand.tagline);
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('the emerald panel: welcome pill, title over the tagline, the line, the verse arches', () => {
    const { container } = render(<SignInPanel />);
    const panel = screen.getByRole('complementary', { name: L.brand.name });
    expect(panel.textContent).toContain(L.signIn.welcome);
    expect(panel.textContent).toContain(L.signIn.title);
    expect(screen.getByText(t.familyApp.signIn.welcome)).toBeTruthy();
    // The low arch on phones, the tall one from lg: both decorative.
    const verses = screen.getAllByText(L.verse.text);
    expect(verses).toHaveLength(2);
    expect(container.querySelectorAll('[aria-hidden="true"] [lang="ar"]')).toHaveLength(2);
  });

  it('«أو» between two hairlines, the lines hidden from screen readers', () => {
    const { container } = render(<OrDivider />);
    expect(container.textContent).toBe(L.signIn.or);
    expect(container.querySelectorAll('span[aria-hidden="true"]')).toHaveLength(2);
  });
});
