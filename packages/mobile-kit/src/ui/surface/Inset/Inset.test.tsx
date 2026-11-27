import { render, screen } from '@testing-library/react-native';
import { ListRow } from '../../layout/ListRow';
import { InsetCell, InsetGroup, InsetSeparator, useInset } from './Inset';
import { AppText } from '../../primitives/AppText';

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

test('a virtualised cell: the first rounds the top, the last the bottom, rows know they are inset', async () => {
  await render(
    <>
      <InsetCell place={{ first: true, last: false }}>
        <Probe />
      </InsetCell>
      <InsetCell place={{ first: false, last: true }}>
        <AppText>last</AppText>
      </InsetCell>
    </>,
  );
  const [top, bottom] = screen.getAllByTestId('inset-cell');
  expect(top).toHaveStyle({ borderTopLeftRadius: 20, borderBottomLeftRadius: 0 });
  expect(bottom).toHaveStyle({ borderTopLeftRadius: 0, borderBottomRightRadius: 20 });
  expect(screen.getByText('inset')).toBeTruthy();
});

test('a separator keeps the side edges and draws the inset rule', async () => {
  await render(<InsetSeparator />);
  expect(screen.toJSON()).toMatchObject({
    props: { style: expect.objectContaining({ borderLeftWidth: expect.any(Number) }) },
    children: [{ props: { style: expect.objectContaining({ marginHorizontal: 16 }) } }],
  });
});
