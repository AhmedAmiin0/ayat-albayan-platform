import { createColumnHelper } from '@tanstack/react-table';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataTable, type DataTableFeatures } from '@/components/data-table/DataTable';
import { PageFrame, SCROLL } from './PageFrame';

describe('PageFrame', () => {
  it('the scroll box has 4px of inline room for a focus ring (2px outline + 2px offset), net zero layout', () => {
    expect(SCROLL).toContain('-mx-1');
    expect(SCROLL).toContain('px-1');
    expect(SCROLL).not.toMatch(/\b(?:ml|mr|pl|pr)-/);
  });

  it('the work page scrolls inside data-page-scroll, never the document', () => {
    const { container } = render(<PageFrame>x</PageFrame>);
    const box = container.querySelector('[data-page-scroll]');
    expect(box?.textContent).toBe('x');
    expect(box?.className).toContain('overflow-y-auto');
  });

  it('the page head pins in the frame and a table header pins in the nearest scroller', () => {
    expect(SCROLL).toContain('[&_[data-page-head]]:sticky');
    expect(SCROLL).toContain('[&_thead_th]:sticky');
  });

  it('a fill table header sits inside the table box, so it never shares the frame with the head', () => {
    const col = createColumnHelper<DataTableFeatures, { id: string }>();
    const columns = col.columns([col.accessor('id', { header: () => 'id' })]);
    const { container } = render(
      <PageFrame>
        <div data-page-head>head</div>
        <DataTable fill columns={columns} data={[{ id: '1' }]} />
      </PageFrame>,
    );
    const th = container.querySelector('thead th');
    expect(th?.closest('[data-table-box]')).not.toBeNull();
    expect(container.querySelector('[data-page-head]')?.closest('[data-table-box]')).toBeNull();
  });

  it('the frame publishes no rail variables', () => {
    const { container } = render(<PageFrame>x</PageFrame>);
    const box = container.querySelector<HTMLElement>('[data-page-scroll]');
    expect(box?.style.getPropertyValue('--rail-h')).toBe('');
  });
});
