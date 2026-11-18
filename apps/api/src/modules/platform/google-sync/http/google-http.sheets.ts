import type {
  CellValue,
  Rows,
  ValueRender,
} from '@/modules/platform/google-sync/google-client.port';
import { appendAnswer, ignoredAnswer, valuesAnswer } from './google-answers';
import type { GoogleHttp } from './google-http';

const enc = encodeURIComponent;

interface Sheet {
  spreadsheetId: string;
  range: string;
}

/** Sheets v4: read, append, update values; batchUpdate for the Brand styling. */
export class SheetsApi {
  constructor(private readonly http: GoogleHttp) {}

  private base(id: string): string {
    return `${this.http.endpoints.sheets}/v4/spreadsheets/${enc(id)}`;
  }

  private values(input: Sheet): string {
    return `${this.base(input.spreadsheetId)}/values/${enc(input.range)}`;
  }

  async readValues(input: Sheet & { render: ValueRender }): Promise<Rows> {
    const query = { valueRenderOption: input.render, dateTimeRenderOption: 'SERIAL_NUMBER' };
    const res = await this.http.send({ path: this.values(input), query, schema: valuesAnswer });
    return res.values ?? [];
  }

  async appendRow(input: Sheet & { values: CellValue[] }): Promise<{ updatedRange: string }> {
    const res = await this.http.send({
      method: 'POST',
      path: `${this.values(input)}:append`,
      query: { valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS' },
      json: { values: [input.values] },
      schema: appendAnswer,
    });
    return { updatedRange: res.updates?.updatedRange ?? '' };
  }

  async updateValues(input: Sheet & { values: Rows }): Promise<void> {
    await this.http.send({
      method: 'PUT',
      path: this.values(input),
      query: { valueInputOption: 'USER_ENTERED' },
      json: { values: input.values },
      schema: ignoredAnswer,
    });
  }

  async batchUpdate(input: { spreadsheetId: string; requests: readonly object[] }): Promise<void> {
    const path = `${this.base(input.spreadsheetId)}:batchUpdate`;
    const json = { requests: input.requests };
    await this.http.send({ method: 'POST', path, json, schema: ignoredAnswer });
  }
}
