import { switchRow } from '@/nav/GreetingHeader/greeting-header.helpers';

test('the greeting switch keeps a 48 px target and dims while pressed', () => {
  expect(switchRow({ pressed: true })).toMatchObject({ minHeight: 48, opacity: 0.7 });
  expect(switchRow({ pressed: false }).opacity).toBe(1);
});
