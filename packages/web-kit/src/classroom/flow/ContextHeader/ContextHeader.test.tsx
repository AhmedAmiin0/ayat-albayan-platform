import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ContextHeader } from './ContextHeader';

describe('ContextHeader', () => {
  it('shows the lesson title over its time, then its children', () => {
    render(
      <ContextHeader context={{ title: 'Tajweed', subtitle: '10:00' }}>
        <span>extra</span>
      </ContextHeader>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Tajweed' })).toBeTruthy();
    expect(screen.getByText('10:00')).toBeTruthy();
    expect(screen.getByText('extra')).toBeTruthy();
  });

  it("falls back to the room's own name with no context and no time line", () => {
    const { container } = render(<ContextHeader context={null} />);
    expect(screen.getByRole('heading', { level: 1, name: t.classroom.title })).toBeTruthy();
    expect(container.querySelector('p')).toBeNull();
  });
});
