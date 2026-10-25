import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { FormAlert } from './form-alert';

describe('FormAlert', () => {
  it('is a role=alert with the struck glyph, not colour alone', () => {
    render(<FormAlert className="mt-4">{t.common.error}</FormAlert>);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe(t.common.error);
    expect(alert.className).toContain('bg-danger-soft');
    expect(alert.className).toContain('mt-4');
    expect(alert.querySelector('[data-glyph]')?.getAttribute('data-glyph')).toBe('struck');
  });
});
