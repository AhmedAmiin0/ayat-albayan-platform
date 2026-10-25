import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tabs, tabIds } from './tabs';

const TABS = [
  { value: 'a', label: 'أ' },
  { value: 'b', label: 'ب' },
];

describe('Tabs with idPrefix (tab ↔ panel wiring)', () => {
  it('each tab has an id; the selected one controls its panel, which it labels', () => {
    render(
      <>
        <Tabs label="أقسام" tabs={TABS} value="b" onChange={() => undefined} idPrefix="x" />
        <div role="tabpanel" id={tabIds('x', 'b').panel} aria-labelledby={tabIds('x', 'b').tab} />
      </>,
    );
    const [a, b] = screen.getAllByRole('tab');
    expect(a?.id).toBe('x-tab-a');
    expect(a?.getAttribute('aria-controls')).toBeNull();
    expect(b?.getAttribute('aria-controls')).toBe('x-panel-b');
    expect(screen.getByRole('tabpanel', { name: 'ب' })).toBeTruthy();
  });

  it('without idPrefix the tabs carry no ids (unchanged)', () => {
    render(<Tabs label="أقسام" tabs={TABS} value="a" onChange={() => undefined} />);
    expect(screen.getAllByRole('tab').every((tab) => !tab.id && !tab.hasAttribute('aria-controls'))).toBe(true);
  });
});
