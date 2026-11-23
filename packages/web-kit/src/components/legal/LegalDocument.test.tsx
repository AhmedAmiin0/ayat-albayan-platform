import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LegalDocument } from './LegalDocument';

describe('LegalDocument: a public legal page without the app shell', () => {
  it('the academy emblem, one level-1 title, the last-updated line, the sections', () => {
    const { container } = render(
      <LegalDocument title="Privacy policy" updated="Last updated: 2026-11-21">
        <p>body</p>
      </LegalDocument>,
    );
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([
      'Privacy policy',
    ]);
    expect(screen.getByText('Last updated: 2026-11-21')).toBeTruthy();
    expect(screen.getByText('body')).toBeTruthy();
    expect(container.querySelector('img[data-mark]')).toBeTruthy();
  });

  it('the footer slot goes in a contentinfo landmark; none without it', () => {
    const { rerender } = render(
      <LegalDocument title="T" updated="U" footer={<a href="/x">other page</a>}>
        <p>b</p>
      </LegalDocument>,
    );
    expect(screen.getByRole('contentinfo').textContent).toContain('other page');
    rerender(
      <LegalDocument title="T" updated="U">
        <p>b</p>
      </LegalDocument>,
    );
    expect(screen.queryByRole('contentinfo')).toBeNull();
  });
});
