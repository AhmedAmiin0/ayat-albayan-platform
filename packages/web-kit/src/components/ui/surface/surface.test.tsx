import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, cardClass } from './card';
import { Dot, Pill } from './pill';
import { SectionHeader } from './section-header';

describe('Card', () => {
  it('is the raised surface with the rule edge, padding from the caller', () => {
    render(<Card className="p-4">x</Card>);
    const card = screen.getByText('x');
    expect(card.className).toContain(cardClass);
    expect(card.className).toContain('p-4');
    expect(card.className).not.toContain('ab-press');
  });

  it('lends its look to the child element, pressable when it is one tap', () => {
    render(
      <Card asChild pressable>
        <button type="button">open</button>
      </Card>,
    );
    const button = screen.getByRole('button', { name: 'open' });
    expect(button.className).toContain('ab-press');
    expect(button.className).toContain('bg-raised');
  });
});

describe('SectionHeader', () => {
  it('heads a section at the asked level with its action at the end', () => {
    render(<SectionHeader title="الأبناء" id="kids" level={3} action={<a href="/x">all</a>} />);
    const heading = screen.getByRole('heading', { level: 3, name: 'الأبناء' });
    expect(heading.id).toBe('kids');
    expect(screen.getByRole('link', { name: 'all' }).getAttribute('href')).toBe('/x');
  });

  it('defaults to h2', () => {
    render(<SectionHeader title="الأسبوع" />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('الأسبوع');
  });
});

describe('Pill and Dot', () => {
  it('a pill is tinted in its tone', () => {
    render(<Pill tone="act">يحتاج تأكيد</Pill>);
    expect(screen.getByText('يحتاج تأكيد').className).toContain('bg-act-soft text-act');
  });

  it('a dot is a coloured mark beside plain ink-2 text; live pops in once', () => {
    const { container } = render(
      <Dot tone="ok" live>
        الدخول متاح الآن
      </Dot>,
    );
    const mark = container.querySelector('[aria-hidden="true"]');
    expect(mark?.className).toContain('bg-ok');
    expect(mark?.className).toContain('animate-pop-in');
    expect(screen.getByText('الدخول متاح الآن').className).toContain('text-ink-2');
  });
});
