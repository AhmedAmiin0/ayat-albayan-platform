import type { FamilyPick } from '@ab/client-core';
import { render, screen } from '@testing-library/react-native';
import type { TabItem } from '@ab/mobile-kit';
import { student } from '@/portal/portal.fixtures';
import { FamilyTabs } from './FamilyTabs';

const mockPick: { current: FamilyPick } = { current: { state: 'loading' } };
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text: RNText } = jest.requireActual('react-native');
    return <RNText>{`redirect ${href}`}</RNText>;
  },
}));
jest.mock('@/portal', () => ({
  ...jest.requireActual('@/portal'),
  useFamilyPick: () => mockPick.current,
}));
jest.mock('@ab/mobile-kit', () => ({
  ...jest.requireActual('@ab/mobile-kit'),
  AppNativeTabs: ({ tabs }: { tabs: TabItem[] }) => {
    const { Text } = jest.requireActual('react-native');
    return tabs.map((tab) => (
      <Text key={tab.name}>{`${tab.name}:${tab.hidden ? 'hidden' : 'shown'}`}</Text>
    ));
  },
}));

test('a guardian of several with no pick: off to the picker, no tabs', async () => {
  mockPick.current = { state: 'choose' };
  await render(<FamilyTabs />);
  expect(screen.getByText(/^redirect /)).toBeTruthy();
  expect(screen.queryByText(/^index:/)).toBeNull();
});

test('while loading: the reports tab is hidden, the rest shown', async () => {
  mockPick.current = { state: 'loading' };
  await render(<FamilyTabs />);
  expect(screen.getByText('index:shown')).toBeTruthy();
  expect(screen.getByText('reports:hidden')).toBeTruthy();
});

test('one student in view: all four tabs', async () => {
  mockPick.current = { state: 'one', student: student() };
  await render(<FamilyTabs />);
  expect(screen.getAllByText(/:shown$/)).toHaveLength(4);
});
