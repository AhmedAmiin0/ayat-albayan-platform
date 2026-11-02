import { searchOf } from './registration-check';

// The API's query_too_short counts letters and digits only: the same check runs before posting.
describe('searchOf (name)', () => {
  it.each(['ا**', 'ـاـ', 'ا,,', '___'])('%s is too short', (text) => {
    expect(searchOf('name', text)).toEqual({ error: 'query_too_short' });
  });

  it.each(['سهيلة', 'AB-1'])('%s is searched as typed', (text) => {
    expect(searchOf('name', text)).toEqual({ search: { by: 'name', q: text } });
  });
});
