import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { inTree, TreeBaseProvider, useTreeBase } from './tree-base';

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
