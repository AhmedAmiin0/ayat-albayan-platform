import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { LastMessageLine } from './LastMessageLine';

const p = t.presence;

describe('LastMessageLine: the WhatsApp header (docs/33 §4)', () => {
  it('«آخر رسالة منذ 5 دقائق» from the last inbound message, no online dot', () => {
    const at = new Date(Date.now() - 5 * 60_000).toISOString();
    const { container } = render(<LastMessageLine lastInboundAt={at} />);
    const when = p.minutes.few.replace('{n}', '5');
    expect(screen.getByText(p.lastMessage.replace('{when}', when))).toBeTruthy();
    expect(container.querySelector('.bg-ok')).toBeNull();
  });

  it('they never wrote: nothing', () => {
    const { container } = render(<LastMessageLine lastInboundAt={null} />);
    expect(container.textContent).toBe('');
  });
});
