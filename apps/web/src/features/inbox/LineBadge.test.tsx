import en from '@ab/shared/i18n/en.json';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LineBadge } from './LineBadge';

const lang = vi.hoisted(() => ({ locale: 'ar' as 'ar' | 'en' }));
vi.mock('@/lib/i18n', async (orig) => {
  const real = await orig<{ t: object }>();
  return {
    ...real,
    get t() {
      return lang.locale === 'en' ? en : real.t;
    },
  };
});

afterEach(() => {
  lang.locale = 'ar';
});

describe('LineBadge (docs/12 §13.10)', () => {
  it('null and undefined render nothing (history, single-line deployments)', () => {
    const { container } = render(
      <>
        <LineBadge line={null} />
        <LineBadge line={undefined} />
      </>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('a chat line is a plain word with data-line, no tone, no glyph, without any provider', async () => {
    const { t } = await import('@/lib/i18n');
    render(<LineBadge line="chat" />);
    const badge = screen.getByTestId('line-badge');
    expect(badge.textContent).toBe(t.enums.waLine.chat);
    expect(badge.getAttribute('data-line')).toBe('chat');
    expect(badge.getAttribute('data-tone')).toBeNull();
    expect(badge.querySelector('svg')).toBeNull();
  });

  it('the notifications line in English', () => {
    lang.locale = 'en';
    render(<LineBadge line="notifications" />);
    expect(screen.getByTestId('line-badge').textContent).toBe('Notifications line');
  });
});
