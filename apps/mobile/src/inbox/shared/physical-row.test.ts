import { physicalRow } from './physical-row';

// What RN does with each logical style: the physical side a child ends up on.
function physicalOrder(direction: 'row' | 'row-reverse', rtl: boolean): 'left-to-right' | 'right-to-left' {
  return (direction === 'row') !== rtl ? 'left-to-right' : 'right-to-left';
}
const sideOf = (logical: 'start' | 'end', rtl: boolean) => ((logical === 'start') !== rtl ? 'left' : 'right');
const alignSide = (align: 'flex-start' | 'flex-end', rtl: boolean) => sideOf(align === 'flex-start' ? 'start' : 'end', rtl);

describe('physicalRow: the chat bars keep WhatsApp’s physical order whatever the language', () => {
  it('Arabic (RTL): row-reverse, the physical left is the inline-end', () => {
    expect(physicalRow(true)).toEqual({ direction: 'row-reverse', left: 'flex-end', leftEdge: 'end' });
  });

  it('English (LTR): a plain row, the physical left is the inline-start', () => {
    expect(physicalRow(false)).toEqual({ direction: 'row', left: 'flex-start', leftEdge: 'start' });
  });

  it.each([true, false])('rtl=%s: children go left → right, the left styles land on the left', (rtl) => {
    const row = physicalRow(rtl);
    expect(physicalOrder(row.direction, rtl)).toBe('left-to-right');
    expect(alignSide(row.left, rtl)).toBe('left');
    expect(sideOf(row.leftEdge, rtl)).toBe('left');
  });
});
