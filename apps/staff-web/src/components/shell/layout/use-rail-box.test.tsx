import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRailBox } from './use-rail-box';

function Box() {
  const ref = useRailBox<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="box">
      <div data-page-head>head</div>
    </div>
  );
}

describe('useRailBox', () => {
  afterEach(() => vi.restoreAllMocks());

  it('publishes the space under the page head as --rail-top and --rail-h', () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(700);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(60);
    const { getByTestId } = render(<Box />);
    const box = getByTestId('box');
    expect(box.style.getPropertyValue('--rail-top')).toBe('76px');
    expect(box.style.getPropertyValue('--rail-h')).toBe('608px');
  });

  it('never makes a rail shorter than 240px on a very short window', () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(60);
    const { getByTestId } = render(<Box />);
    expect(getByTestId('box').style.getPropertyValue('--rail-h')).toBe('240px');
  });
});
