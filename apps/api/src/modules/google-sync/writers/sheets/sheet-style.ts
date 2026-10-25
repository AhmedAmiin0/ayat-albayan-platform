import { BRAND } from '../../google-format';

// Brand styleSheet («آيات البيان — الهوية (Brand)», docs/24 §1) as one Sheets batchUpdate: RTL,
// hidden gridlines, frozen header, green header with white bold text and a thick gold bottom
// border, banding white / paper. Only ever applied to a sheet the platform just created (tab 0).

const rgb = (hex: string) => ({
  red: parseInt(hex.slice(1, 3), 16) / 255,
  green: parseInt(hex.slice(3, 5), 16) / 255,
  blue: parseInt(hex.slice(5, 7), 16) / 255,
});

export function brandStyle(columns: number): object[] {
  const header = { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columns };
  return [
    {
      updateSheetProperties: {
        properties: { sheetId: 0, rightToLeft: true, gridProperties: { frozenRowCount: 1, hideGridlines: true } },
        fields: 'rightToLeft,gridProperties.frozenRowCount,gridProperties.hideGridlines',
      },
    },
    {
      repeatCell: {
        range: header,
        cell: { userEnteredFormat: { backgroundColor: rgb(BRAND.green), textFormat: { foregroundColor: rgb(BRAND.white), bold: true } } },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
    { updateBorders: { range: header, bottom: { style: 'SOLID_THICK', color: rgb(BRAND.gold) } } },
    {
      addBanding: {
        bandedRange: {
          range: { sheetId: 0, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: columns },
          rowProperties: { firstBandColor: rgb(BRAND.white), secondBandColor: rgb(BRAND.paper) },
        },
      },
    },
  ];
}
