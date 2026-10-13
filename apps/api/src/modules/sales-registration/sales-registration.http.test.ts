import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { registrationApp, row, type Who } from './sales-registration.fakes';

type App = Awaited<ReturnType<typeof registrationApp>>;
const URL = '/sales/registration-check';
const PHONE = `${URL}?phone=%2B966551110000`;
const NAME = `${URL}?q=${encodeURIComponent('ياسمين')}`;

describe('GET /sales/registration-check (students.check_registration)', () => {
  let t: App;
  beforeAll(async () => {
    t = await registrationApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.queries.byPhone.mockResolvedValue([]);
    t.queries.byName.mockResolvedValue([]);
  });

  it('a salesperson (and the admin) may check; without the permission 403 and nothing is read', async () => {
    for (const who of ['sales', 'admin'] as Who[]) expect([who, (await t.get(PHONE, who)).statusCode]).toEqual([who, 200]);
    for (const who of ['salesOff', 'teacher', 'assistant'] as Who[]) expect([who, (await t.get(PHONE, who)).statusCode]).toEqual([who, 403]);
    expect(t.queries.byPhone).toHaveBeenCalledTimes(2);
  });

  it('by phone: the family’s children, whitelisted to name, code, status and teacher', async () => {
    t.queries.byPhone.mockResolvedValue([row('ياسمين'), row('عمر', { code: 'AB-0102', status: 'churned', teacher_name: null })]);
    const res = await t.get(PHONE, 'sales');
    expect(t.queries.byPhone).toHaveBeenCalledWith('+966551110000');
    expect(t.queries.byName).not.toHaveBeenCalled();
    expect(res.json()).toEqual({
      found: true,
      more: false,
      matches: [
        { name: 'ياسمين', code: 'AB-0101', status: 'active', teacher_name: 'أبرار' },
        { name: 'عمر', code: 'AB-0102', status: 'churned', teacher_name: null },
      ],
    });
    expect(res.body).not.toMatch(/id-|\+9665|phone|notes|price|سر/);
  });

  it('by name or code: the trimmed term goes to the name search; none found is found:false', async () => {
    const res = await t.get(`${NAME}%20`, 'sales');
    expect(t.queries.byName).toHaveBeenCalledWith('ياسمين');
    expect(res.json()).toEqual({ found: false, matches: [], more: false });
    t.queries.byName.mockResolvedValue([row('ياسمين', { status: 'pending_renewal' })]);
    expect((await t.get(`${URL}?q=AB-0101`, 'sales')).json().matches).toEqual([
      { name: 'ياسمين', code: 'AB-0101', status: 'pending_renewal', teacher_name: 'أبرار' },
    ]);
  });

  it('over 10 matches: the first 10 and more:true; exactly the keys {found, matches, more}', async () => {
    t.queries.byName.mockResolvedValue(Array.from({ length: 11 }, (_, i) => row(`طالب ${i}`)));
    const body = (await t.get(NAME, 'sales')).json();
    expect(Object.keys(body).sort()).toEqual(['found', 'matches', 'more']);
    expect(body.matches).toHaveLength(10);
    expect(body.more).toBe(true);
    for (const m of body.matches) expect(Object.keys(m).sort()).toEqual(['code', 'name', 'status', 'teacher_name']);
  });

  it('400 validation_failed: query_too_short, invalid_phone, one_of (none or both); nothing is read', async () => {
    const cases: [string, string][] = [
      [`${URL}?q=%D9%8A%D8%A7`, 'query_too_short'],
      [`${URL}?q=%20ab%20`, 'query_too_short'],
      [`${URL}?phone=12`, 'invalid_phone'],
      [`${URL}?phone=abc`, 'invalid_phone'],
      [URL, 'one_of'],
      [`${PHONE}&q=AB-0101`, 'one_of'],
    ];
    for (const [url, code] of cases) {
      const res = await t.get(url, 'sales');
      expect([url, res.statusCode, res.json().message, res.json().issues.map((i: { message: string }) => i.message)]).toEqual([url, 400, 'validation_failed', [code]]);
    }
    expect(t.queries.byPhone).not.toHaveBeenCalled();
    expect(t.queries.byName).not.toHaveBeenCalled();
  });
});
