import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LegalSection } from './LegalSection';

describe('LegalSection: one titled part of a legal page', () => {
  it('a level-2 heading that names the section, then the paragraph', () => {
    render(<LegalSection id="who" title="Who we are" body="The academy runs the app." />);
    const section = screen.getByRole('region', { name: 'Who we are' });
    expect(within(section).getByRole('heading', { level: 2 }).id).toBe('legal-who');
    expect(within(section).getByText('The academy runs the app.')).toBeTruthy();
  });

  it('items as a list in their order; no list without items', () => {
    const { rerender } = render(<LegalSection id="d" title="Data" items={['Names', 'Phones']} />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['Names', 'Phones']);
    rerender(<LegalSection id="d" title="Data" items={[]} />);
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('ordered steps as a numbered list', () => {
    render(<LegalSection id="s" title="Steps" items={['One', 'Two']} ordered />);
    expect(screen.getByRole('list').tagName).toBe('OL');
  });

  it('children after the text (the contact link)', () => {
    render(
      <LegalSection id="c" title="Contact" body="Write to us:">
        <a href="mailto:x@example.org">x@example.org</a>
      </LegalSection>,
    );
    expect(screen.getByRole('link', { name: 'x@example.org' })).toBeTruthy();
  });
});
