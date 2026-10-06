import { applicantParams, applicantSortChoices, safeLink } from './applicant-params';

test('all statuses and the default order send nothing', () => {
  expect(applicantParams('all', '')).toEqual({ status: undefined, sort: undefined, dir: undefined });
});

test('a status and an order travel as the web sends them', () => {
  expect(applicantParams('interview', 'name')).toEqual({ status: 'interview', sort: 'name', dir: undefined });
  expect(applicantParams('new', 'created_at:desc')).toEqual({ status: 'new', sort: 'created_at', dir: 'desc' });
});

test('an unknown sort key is dropped with its direction', () => {
  expect(applicantParams('all', 'notes:desc')).toMatchObject({ sort: undefined, dir: undefined });
});

test('four order choices, the default first', () => {
  const choices = applicantSortChoices();
  expect(choices).toHaveLength(4);
  expect(choices[0]?.value).toBe('');
});

test('only http(s) links open', () => {
  expect(safeLink('https://drive.google.com/x')).toBe('https://drive.google.com/x');
  expect(safeLink(' http://a.b/c ')).toBe('http://a.b/c');
  for (const bad of ['javascript:alert(1)', 'file:///etc/passwd', 'tel:+966', '', null, undefined]) {
    expect(safeLink(bad)).toBeNull();
  }
});
