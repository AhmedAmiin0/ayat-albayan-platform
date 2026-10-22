import { describe, expect, it } from 'vitest';
import { brandStyle } from './sheet-style';

describe('Brand sheet style', () => {
  it('RTL, hidden gridlines, frozen header, green/white header, gold border, banding', () => {
    const [props, header, border, banding] = brandStyle(13) as [
      { updateSheetProperties: { properties: { rightToLeft: boolean; gridProperties: { frozenRowCount: number; hideGridlines: boolean } } } },
      { repeatCell: { range: { endColumnIndex: number }; cell: { userEnteredFormat: { backgroundColor: { red: number }; textFormat: { bold: boolean } } } } },
      { updateBorders: { bottom: { style: string } } },
      { addBanding: { bandedRange: { rowProperties: { secondBandColor: { red: number; green: number; blue: number } } } } },
    ];
    expect(props.updateSheetProperties.properties).toMatchObject({ rightToLeft: true, gridProperties: { frozenRowCount: 1, hideGridlines: true } });
    expect(header.repeatCell.range.endColumnIndex).toBe(13);
    expect(header.repeatCell.cell.userEnteredFormat.backgroundColor.red).toBeCloseTo(12 / 255);
    expect(header.repeatCell.cell.userEnteredFormat.textFormat.bold).toBe(true);
    expect(border.updateBorders.bottom.style).toBe('SOLID_THICK');
    expect(banding.addBanding.bandedRange.rowProperties.secondBandColor).toEqual({ red: 253 / 255, green: 248 / 255, blue: 240 / 255 });
  });
});
