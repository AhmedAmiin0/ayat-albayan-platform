import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { chatStudentHref, InChatProvider, inTree, TreeBaseProvider, useStudentHref, useTreeBase } from './tree-base';

test('the admin tree keeps every link as is', () => {
  expect(inTree('', '/inbox/thread/%2B1')).toBe('/inbox/thread/%2B1');
  const href = { pathname: '/inbox/book', params: { leadId: 'l1' } } as const;
  expect(inTree('', href)).toBe(href);
});

test('the sales and assistant trees prefix strings and pathnames, params untouched', () => {
  expect(inTree('/sales', '/inbox/thread/%2B1')).toBe('/sales/inbox/thread/%2B1');
  expect(inTree('/assistant', '/more/meetings')).toBe('/assistant/more/meetings');
  expect(inTree('/sales', { pathname: '/inbox/book', params: { leadId: 'l1' } })).toEqual({
    pathname: '/sales/inbox/book',
    params: { leadId: 'l1' },
  });
});

test('outside a provider the base is the admin tree; inside, the provider’s', async () => {
  expect((await renderHook(useTreeBase)).result.current).toBe('');
  const wrapper = ({ children }: { children: ReactNode }) => <TreeBaseProvider value="/sales">{children}</TreeBaseProvider>;
  expect((await renderHook(useTreeBase, { wrapper })).result.current).toBe('/sales');
});

test('a tab’s student route moves to the chat group’s copy; nothing else moves', () => {
  expect(chatStudentHref('/students/s1/attendance')).toBe('/inbox/student/s1/attendance');
  expect(chatStudentHref('/sales/students/s1')).toBe('/sales/inbox/student/s1');
  const renew = { pathname: '/students/subscribe', params: { studentId: 's1', renew: '1' } } as const;
  expect(chatStudentHref(renew)).toEqual({ pathname: '/inbox/student/subscribe', params: { studentId: 's1', renew: '1' } });
  for (const other of ['/students', '/inbox/thread/%2B1', '/teacher/reports/student/s1', '/more/students/x']) expect(chatStudentHref(other)).toBe(other);
});

test('student links stay the tab’s routes outside a chat group and become its copies inside one', async () => {
  expect((await renderHook(useStudentHref)).result.current('/students/payment/s1')).toBe('/students/payment/s1');
  const wrapper = ({ children }: { children: ReactNode }) => <InChatProvider>{children}</InChatProvider>;
  expect((await renderHook(useStudentHref, { wrapper })).result.current('/students/payment/s1')).toBe('/inbox/student/payment/s1');
});
