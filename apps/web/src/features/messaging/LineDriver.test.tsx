import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { LineDriver } from './LineDriver';

const s = t.templates.settings.lines;

describe('LineDriver (docs/19)', () => {
  it('names the provider and nothing else when the line can send', () => {
    render(<LineDriver view={{ provider: 'meta', gaps: [] }} />);
    expect(screen.getByText(t.integrations.options.meta)).toBeTruthy();
    expect(screen.queryByText(s.gaps.split('{keys}')[0] ?? '', { exact: false })).toBeNull();
  });

  it('a half-configured kapso line names the missing keys, never a value', () => {
    const { container } = render(<LineDriver view={{ provider: 'kapso', gaps: ['KAPSO_API_BASE', 'KAPSO_API_KEY'] }} />);
    expect(screen.getByText(t.integrations.options.kapso)).toBeTruthy();
    expect(screen.getByText('KAPSO_API_BASE, KAPSO_API_KEY')).toBeTruthy();
    expect(container.textContent).toContain(s.provider);
  });
});
