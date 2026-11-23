import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@ab/web-kit/lib/http/supabase', () => ({ supabase: { auth: {} } }));
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { MaintenanceScreen } from './MaintenanceScreen';

const S = t.maintenance;

describe('MaintenanceScreen («تحت الصيانة», owner 2026-11-21)', () => {
  it.each([
    { kind: 'maintenance', words: S.planned },
    { kind: 'down', words: S.outage },
  ] as const)('$kind: the brand, its title (h2, announced) and body', ({ kind, words }) => {
    render(<MaintenanceScreen kind={kind} checking={false} onRetry={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    const title = screen.getByRole('heading', { level: 2, name: words.title });
    expect(screen.getByRole('status').contains(title)).toBe(true);
    expect(screen.getByText(words.body)).toBeTruthy();
  });

  it('one large button asks again', () => {
    const onRetry = vi.fn();
    render(<MaintenanceScreen kind="down" checking={false} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: S.retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    // The retry and the other language (as on the family sign-in), nothing else.
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: new RegExp(t.language.label) })).toBeTruthy();
  });

  it('reads «جارٍ التحقق…» while a check runs', () => {
    render(<MaintenanceScreen kind="maintenance" checking onRetry={vi.fn()} />);
    const button = screen.getByRole('button', { name: S.checking });
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('lies above the kit top layer (calls are z-60)', () => {
    const { container } = render(<MaintenanceScreen kind="down" checking={false} onRetry={vi.fn()} />);
    expect(container.firstElementChild?.className).toContain('z-[70]');
  });
});
