import { leadStatusStyle } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@/theme';
import { FilterPills, type FilterPill } from './FilterPills';

type Filter = 'all' | 'new' | 'lost';
const items: FilterPill<Filter>[] = [
  { value: 'all', label: t.leads.filterAll },
  { value: 'new', label: t.enums.leadStatus.new, ...leadStatusStyle.new, count: 3 },
  { value: 'lost', label: t.enums.leadStatus.lost, ...leadStatusStyle.lost },
];

async function setup(value: Filter = 'all') {
  const onChange = jest.fn();
  await render(
    <FilterPills items={items} value={value} onChange={onChange} accessibilityLabel="filter" />,
  );
  return onChange;
}

test('one selected tab inside a named tablist', async () => {
  await setup('new');
  expect(screen.getByLabelText('filter')).toBeTruthy();
  expect(screen.getAllByRole('tab')).toHaveLength(3);
  expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
    `${t.enums.leadStatus.new} 3`,
  );
});

test('pressing a pill reports its value', async () => {
  const onChange = await setup();
  await fireEvent.press(screen.getByRole('tab', { name: new RegExp(t.enums.leadStatus.lost) }));
  expect(onChange).toHaveBeenCalledWith('lost');
});

test('a count shows only when given (no invented numbers)', async () => {
  await setup();
  expect(screen.getByRole('tab', { name: new RegExp(t.enums.leadStatus.lost) })).toHaveTextContent(
    t.enums.leadStatus.lost,
    { exact: true },
  );
});

test('status pills carry their nuqta shape', async () => {
  await setup();
  const hidden = { includeHiddenElements: true };
  expect(screen.getByTestId('nuqta-hollow', hidden)).toBeTruthy();
  expect(screen.getByTestId('nuqta-struck', hidden)).toBeTruthy();
});

test('the pill row keeps its own height beside a flex: 1 list (a horizontal ScrollView grows by default)', async () => {
  await setup();
  expect(screen.getByLabelText('filter')).toHaveStyle({ flexGrow: 0, flexShrink: 0 });
});

test('a value setter is a radiogroup: radios with checked, not tabs', async () => {
  await render(
    <FilterPills items={items} value="lost" onChange={jest.fn()} accessibilityLabel="status" role="radiogroup" />,
  );
  expect(screen.queryAllByRole('tab')).toHaveLength(0);
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  expect(screen.getByRole('radio', { checked: true })).toHaveTextContent(t.enums.leadStatus.lost);
});

test('the selected pill is the action green on its wash (option A), the others stay plain', async () => {
  await setup('new');
  const theme = palette.light;
  expect(screen.getByRole('tab', { selected: true })).toHaveStyle({ backgroundColor: theme.lapisWash, borderColor: theme.lapisWash });
  expect(screen.getByRole('tab', { name: new RegExp(t.leads.filterAll) })).toHaveStyle({ backgroundColor: theme.raised });
});
