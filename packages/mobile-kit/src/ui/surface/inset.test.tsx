import { render, screen } from '@testing-library/react-native';
import { ListRow } from '../layout/ListRow';
import { InsetGroup, useInset } from './inset';
import { AppText } from '../primitives/AppText';

function Probe() {
  return <AppText>{useInset() ? 'inset' : 'alone'}</AppText>;
}

test('a group: one rounded raised card, skipped children leave no gap, rows know they are inset', async () => {
  const hidden = false;
  await render(
    <InsetGroup testID="group">
      <Probe />
      {hidden && <AppText>never</AppText>}
      <ListRow title="حسابي" onPress={jest.fn()} />
    </InsetGroup>,
  );
  expect(screen.getByTestId('group')).toHaveStyle({ borderRadius: 20, overflow: 'hidden' });
  expect(screen.getByText('inset')).toBeTruthy();
  expect(screen.queryByText('never')).toBeNull();
  // The group draws the fill and the rules: the row has neither.
  expect(screen.getByRole('button', { name: /حسابي/ })).not.toHaveStyle({ borderBottomWidth: 1 });
});

test('alone: a ListRow keeps its own fill and hairline; an empty group renders nothing', async () => {
  await render(
    <>
      <Probe />
      <ListRow title="خارج" onPress={jest.fn()} />
      <InsetGroup testID="empty">{false}</InsetGroup>
    </>,
  );
  expect(screen.getByText('alone')).toBeTruthy();
  expect(screen.getByRole('button', { name: /خارج/ })).toHaveStyle({ borderBottomWidth: 1 });
  expect(screen.queryByTestId('empty')).toBeNull();
});
