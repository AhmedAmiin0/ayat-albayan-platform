import { linkStyle } from '@/nav/ChildSwitchLink/child-switch-link.helpers';

test('the switch link dims while pressed', () => {
  expect(linkStyle({ pressed: true }).opacity).toBe(0.7);
  expect(linkStyle({ pressed: false }).opacity).toBe(1);
});
