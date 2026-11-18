import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { FamilyBrand } from './FamilyBrand';

const B = t.familyLook.brand;

describe('FamilyBrand: the mark tile, the name and the gold tagline', () => {
  it('the full lockup keeps each line on one line', () => {
    render(<FamilyBrand />);
    expect(screen.getByText(B.name).className).toContain('truncate');
    expect(screen.getByText(B.tagline).className).toContain('text-fam-gold');
  });

  it('the phone lockup wraps the name and tagline instead of cutting them («…»)', () => {
    render(<FamilyBrand compact />);
    expect(screen.getByText(B.name).className).toContain('line-clamp-2');
    expect(screen.getByText(B.name).className).not.toContain('truncate');
    expect(screen.getByText(B.tagline).className).toContain('line-clamp-2');
  });
});
