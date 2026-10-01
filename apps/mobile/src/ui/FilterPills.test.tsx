import { leadStatusStyle } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
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
