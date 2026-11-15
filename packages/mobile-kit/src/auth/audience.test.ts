import { audience, setAudience } from './audience';

test('the staff app by default; an entry that names the family app switches it', () => {
  expect(audience()).toBe('staff');
  setAudience('family');
  expect(audience()).toBe('family');
  setAudience('staff');
  expect(audience()).toBe('staff');
});
