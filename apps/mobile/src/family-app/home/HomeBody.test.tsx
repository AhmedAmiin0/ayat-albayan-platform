import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { HomeBody } from './HomeBody';

const children = [
  { id: 's1', code: 'AB-0001', name: 'سارة' },
  { id: 's2', code: 'AB-0002', name: 'يوسف' },
];
const props = { isError: false, onRetry: jest.fn(), onOpen: jest.fn() };

beforeEach(() => jest.clearAllMocks());

test('skeleton cards while /portal/me loads, named once for screen readers', async () => {
  await render(<HomeBody {...props} data={undefined} />);
  expect(screen.getAllByTestId('skeleton-card', { includeHiddenElements: true })).toHaveLength(2);
  expect(screen.getByLabelText(t.familyApp.home.loading)).toBeTruthy();
});

test('one card per child with name and code; a press opens that child', async () => {
  await render(<HomeBody {...props} data={{ kind: 'guardian', students: children }} />);
  expect(screen.getByText('سارة')).toBeTruthy();
  expect(screen.getByText(/AB-0002/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: /يوسف/ }));
  expect(props.onOpen).toHaveBeenCalledWith(children[1]);
});

test('no children: the empty note; a failed first read: the retry', async () => {
  const view = await render(<HomeBody {...props} data={{ kind: 'guardian', students: [] }} />);
  expect(screen.getByText(t.familyApp.home.empty)).toBeTruthy();
  await view.rerender(<HomeBody {...props} isError data={undefined} />);
  expect(screen.queryByText(t.familyApp.home.empty)).toBeNull();
  expect(screen.getByRole('button')).toBeTruthy();
});
