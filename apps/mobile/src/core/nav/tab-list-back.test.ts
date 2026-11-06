import { type TabBackState, tabListBack, tabListOf } from './tab-list-back';

const lone: TabBackState = { pathname: '/students/s1', tab: 'students', focused: true, canDismiss: false };

test('tabListOf: the path up to the tab folder, in every tree', () => {
  expect(tabListOf('/students/s1', 'students')).toBe('/students');
  expect(tabListOf('/sales/students/s1', 'students')).toBe('/sales/students');
  expect(tabListOf('/more/sales/students', 'more')).toBe('/more');
  expect(tabListOf('/teacher/reports/student/s1', 'reports')).toBe('/teacher/reports');
  expect(tabListOf('/', 'students')).toBeNull();
});

test('a lone detail screen in the focused tab: back goes to that tab list', () => {
  expect(tabListBack(lone)).toBe('/students');
  expect(tabListBack({ ...lone, pathname: '/more/teachers/t1', tab: 'more' })).toBe('/more');
});

test('a screen beneath, another tab focused, or the list itself: left to the navigators', () => {
  expect(tabListBack({ ...lone, canDismiss: true })).toBeNull();
  expect(tabListBack({ ...lone, focused: false })).toBeNull();
  expect(tabListBack({ ...lone, pathname: '/students' })).toBeNull();
  expect(tabListBack({ ...lone, tab: '' })).toBeNull();
});
