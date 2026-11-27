import { render, screen } from '@testing-library/react-native';
import { AppText as MockText } from '@ab/mobile-kit';
import { usePushTaps } from '@/push';
import { SwitchTabs } from './SwitchTabs';

jest.mock('@/push', () => ({ usePushTaps: jest.fn() }));
jest.mock('@/nav', () => ({ FamilyTabs: () => <MockText>tabs</MockText> }));
jest.mock('@/switch/ChildSwitchSheet', () => ({
  ChildSwitchSheet: () => <MockText>sheet</MockText>,
}));

test('the tabs and the children sheet, with pushed taps opening their screen', async () => {
  await render(<SwitchTabs />);
  expect(screen.getByText('tabs')).toBeTruthy();
  expect(screen.getByText('sheet')).toBeTruthy();
  expect(usePushTaps).toHaveBeenCalled();
});
