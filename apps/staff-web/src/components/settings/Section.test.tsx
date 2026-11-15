import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Section } from './Section';
import { sectionId } from './section-id';

describe('Section (one section of /admin/settings)', () => {
  it('is a region named by its heading, with the settings-<id> ids the deep links use', () => {
    render(
      <Section id="integrations" title="التكاملات">
        <p>صف</p>
      </Section>,
    );
    const region = screen.getByRole('region', { name: 'التكاملات' });
    expect(region.id).toBe('settings-integrations');
    expect(region.getAttribute('aria-labelledby')).toBe('settings-integrations-title');
    expect(region.className).toBe('scroll-mt-24');
    const heading = screen.getByRole('heading', { level: 2, name: 'التكاملات' });
    expect(heading.id).toBe('settings-integrations-title');
    expect(heading.className).toBe('mb-1 text-h4 font-bold');
    expect(heading.nextElementSibling?.className).toBe('grid gap-4');
    expect(heading.nextElementSibling?.textContent).toBe('صف');
  });

  it('sectionId prefixes the id', () => {
    expect(sectionId('messaging')).toBe('settings-messaging');
    expect(sectionId('custom')).toBe('settings-custom');
  });
});
