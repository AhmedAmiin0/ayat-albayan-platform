import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RunningHead } from './running-head';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T12:20:30Z'));
});
afterEach(() => vi.useRealTimers());

const classesOf = (el: Element | null | undefined) => el?.className.split(' ') ?? [];
const dates = () => screen.getByText('الخميس 1 أكتوبر 2026').parentElement;
const cities = () => screen.getByText(t.runningHead.riyadh).parentElement;
const crumbs = <nav aria-label={t.common.breadcrumbs}>{t.nav.students}</nav>;

describe('RunningHead layouts', () => {
  it('wrap (default): the row wraps and the clocks show from 640px', () => {
    const { container } = render(<RunningHead crumbs={crumbs} />);
    expect(classesOf(container.firstElementChild)).toContain('flex-wrap');
    expect(classesOf(container.firstElementChild)).not.toContain('@container');
    expect(classesOf(dates())).toEqual(expect.arrayContaining(['hidden', 'sm:flex']));
    expect(classesOf(cities())).toEqual(expect.arrayContaining(['hidden', 'sm:flex']));
  });

  it('fit: one row from 900px, the dates from a 1024px row and the cities from 672px', () => {
    const end = <button type="button">{t.bell.open}</button>;
    const { container } = render(<RunningHead layout="fit" crumbs={crumbs} end={end} />);
    const row = classesOf(container.firstElementChild);
    expect(row).toEqual(expect.arrayContaining(['@container', 'shell:flex-nowrap']));
    expect(classesOf(dates())).toEqual(expect.arrayContaining(['sm:max-shell:flex', '@5xl:flex']));
    expect(classesOf(cities())).toEqual(expect.arrayContaining(['sm:max-shell:flex', '@2xl:flex']));
    const endBox = screen.getByRole('button', { name: t.bell.open }).parentElement;
    expect(classesOf(endBox)).toEqual(expect.arrayContaining(['shrink-0', 'whitespace-nowrap']));
  });

  it('inline: one line, no 54px row height, tighter gaps and no empty crumb box', () => {
    const { container } = render(<RunningHead layout="inline" />);
    const row = container.firstElementChild;
    expect(classesOf(row)).toEqual(
      expect.arrayContaining(['min-h-0', 'flex-nowrap', 'whitespace-nowrap']),
    );
    expect(classesOf(row)).not.toContain('min-h-[54px]');
    expect(row?.childElementCount).toBe(1);
    expect(classesOf(cities())).toContain('gap-3');
  });
});
