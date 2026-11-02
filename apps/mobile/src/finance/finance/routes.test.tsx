import { routes } from '@/test/app-routes';

test('the four finance screens are registered routes of the admin tree', () => {
  for (const name of ['payouts', 'expenses', 'invoices', 'summary']) {
    expect(typeof routes[`(tabs)/more/finance/${name}` as keyof typeof routes]).toBe('function');
  }
});
