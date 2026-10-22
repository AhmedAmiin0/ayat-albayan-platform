import type { CellValue, Rows, ValueRender } from './google-client.port';
import type { GoogleHttp } from './google-http';

const enc = encodeURIComponent;

/** Sheets v4: read, append, update values; batchUpdate for the Brand styling. */
export class SheetsApi {
  constructor(private readonly http: GoogleHttp) {}

  private base(id: string): string {
    return `${this.http.endpoints.sheets}/v4/spreadsheets/${enc(id)}`;
  }

  async readValues(input: { spreadsheetId: string; range: string; render: ValueRender }): Promise<Rows> {
    const res = await this.http.send<{ values?: Rows }>({
      method: 'GET',
      url: `${this.base(input.spreadsheetId)}/values/${enc(input.range)}`,
      query: { valueRenderOption: input.render, dateTimeRenderOption: 'SERIAL_NUMBER' },
    });
    return res.values ?? [];
  }

  async appendRow(input: { spreadsheetId: string; range: string; values: CellValue[] }): Promise<{ updatedRange: string }> {
    const res = await this.http.send<{ updates?: { updatedRange?: string } }>({
      method: 'POST',
      url: `${this.base(input.spreadsheetId)}/values/${enc(input.range)}:append`,
      query: { valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS' },
      body: { values: [input.values] },
    });
    return { updatedRange: res.updates?.updatedRange ?? '' };
  }

  async updateValues(input: { spreadsheetId: string; range: string; values: Rows }): Promise<void> {
    await this.http.send({
      method: 'PUT',
      url: `${this.base(input.spreadsheetId)}/values/${enc(input.range)}`,
      query: { valueInputOption: 'USER_ENTERED' },
      body: { values: input.values },
    });
  }

  async batchUpdate(input: { spreadsheetId: string; requests: readonly object[] }): Promise<void> {
    await this.http.send({ method: 'POST', url: `${this.base(input.spreadsheetId)}:batchUpdate`, body: { requests: input.requests } });
  }
}
