import { salesHrefs } from './sales-href';

test('admin tree (double role): the pages under «المزيد» › «المبيعات», as before', () => {
  const href = salesHrefs('');
  expect(href.teacher('t1')).toBe('/more/sales/teachers/t1');
  expect(href.history('s1')).toBe('/more/sales/history/s1');
  expect(href.schedule('t1')).toEqual({ pathname: '/more/sales/schedule', params: { teacherId: 't1' } });
});

test('sales tree: «المزيد» pages under /sales/more, the schedule is its tab', () => {
  const href = salesHrefs('/sales');
  expect(href.teacher('t1')).toBe('/sales/more/teachers/t1');
  expect(href.history('s1')).toBe('/sales/more/history/s1');
  expect(href.schedule('t1')).toEqual({ pathname: '/sales/schedule', params: { teacherId: 't1' } });
});
