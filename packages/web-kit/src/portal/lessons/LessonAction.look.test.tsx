import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { lesson } from '@ab/web-kit/portal/portal.fixtures';
import { renderPortal } from '@ab/web-kit/portal/portal.render';
import { LessonAction } from './LessonAction';

const NOW_OPEN = new Date('2026-10-27T15:55:00.000Z');
const EXTERNAL = { way_in: 'external', meeting_url: 'https://meet.example.org/abc' } as const;

const show = (over: Parameters<typeof lesson>[0], tone?: 'plain' | 'hero') =>
  renderPortal(
    <LessonAction lesson={lesson(over)} studentId="s1" tz="Africa/Cairo" now={NOW_OPEN}
      onJoined={vi.fn()} tone={tone} />,
  );

describe('LessonAction tones (the staff look stays as it was)', () => {
  it('plain: the join keeps its press scale; the link is the bare large button', () => {
    show({});
    const join = screen.getByRole('button', { name: t.portal.join });
    expect(join.className).toContain('active:scale-[0.98]');
    expect(join.className).not.toContain('text-fam-on-gold');
  });

  it('plain external link: exactly the large button classes', () => {
    show(EXTERNAL);
    const link = screen.getByRole('link', { name: t.portal.join });
    expect(link.className).toBe(buttonVariants({ size: 'lg' }));
  });

  it('hero: the gold pill added after the base classes', () => {
    show(EXTERNAL, 'hero');
    const link = screen.getByRole('link', { name: t.portal.join });
    expect(link.className.startsWith(`${buttonVariants({ size: 'lg' })} `)).toBe(true);
    expect(link.className).toContain('text-fam-on-gold');
  });
});
