import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from '@ab/web-kit/components/ui/layout/tabs';
import { TabPanel } from '@ab/web-kit/components/ui/layout/tab-panel/TabPanel';

const TABS = [
  { value: 'lessons', label: 'الحلقات' },
  { value: 'reports', label: 'التقارير' },
];

function Strip({ dir }: { dir: 'rtl' | 'ltr' }) {
  return (
    <div dir={dir}>
      <Tabs label="tabs" idPrefix="p" tabs={TABS} value="reports" onChange={vi.fn()} />
      <TabPanel idPrefix="p" value="reports">
        <table data-table-box="" />
      </TabPanel>
    </div>
  );
}

describe('TabPanel', () => {
  it('is the tabpanel its selected tab controls and is labelled by that tab', () => {
    render(<Strip dir="rtl" />);
    const tab = screen.getByRole('tab', { selected: true });
    const panel = screen.getByRole('tabpanel', { name: 'التقارير' });
    expect(tab.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
    expect(panel.id).toBe('p-panel-reports');
  });

  it('continues the page flex column so a fill table inside it takes the frame height', () => {
    render(<Strip dir="ltr" />);
    const panel = screen.getByRole('tabpanel');
    for (const cls of ['flex', 'flex-col', 'flex-1', 'min-h-0', 'pt-4']) {
      expect(panel.classList.contains(cls)).toBe(true);
    }
    expect(panel.className).not.toMatch(/overflow|max-h-|min-h-\[/);
    expect(panel.querySelector('[data-table-box]')).not.toBeNull();
  });

  it('is focusable once, so a panel without controls can still be reached by keyboard', () => {
    render(<Strip dir="rtl" />);
    expect(screen.getByRole('tabpanel').getAttribute('tabindex')).toBe('0');
  });
});
