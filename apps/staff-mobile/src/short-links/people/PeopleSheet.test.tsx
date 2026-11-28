import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { formatPhone } from '@ab/core';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { people } from '@/short-links/testing/link-fixtures';
import { PeopleSheet } from './PeopleSheet';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const P = t.shortLinks.people;
const F = t.shortLinks.form;
const guardian = { id: people[0]?.id ?? '', name: 'أحمد علي', role: 'guardian' };

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue(people);
});

test('picked people first; a search lists users by name and role, the chips filter', async () => {
  const onDone = jest.fn();
  await renderWithQuery(
    <PeopleSheet
      people={[guardian]}
      phones={[]}
      maxUsers={5}
      onDone={onDone}
      onClose={jest.fn()}
    />,
  );
  expect(screen.getByText(P.searchMin)).toBeTruthy();
  expect(screen.getByRole('checkbox', { name: 'أحمد علي' }).props.accessibilityState).toEqual({
    checked: true,
  });
  await fireEvent.changeText(screen.getByLabelText(P.search), 'حس');
  expect(await screen.findByRole('checkbox', { name: 'حسن إبراهيم' })).toBeTruthy();
  await waitFor(() =>
    expect(mockApiFetch).toHaveBeenCalledWith('/short-links/people?search=%D8%AD%D8%B3'),
  );
  expect(screen.getByText(t.activity.roles.teacher)).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: P.filters.guardians }));
  expect(screen.queryByRole('checkbox', { name: 'حسن إبراهيم' })).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: P.filters.teachers }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'حسن إبراهيم' }));
  const done = P.doneOf.replace('{n}', '2').replace('{max}', '5');
  await fireEvent.press(screen.getByRole('button', { name: done }));
  expect(onDone).toHaveBeenCalledWith({
    people: [guardian, people[1]],
    phones: [],
  });
});

test('a free number: E.164 checked, listed as «رقم غير مسجّل», removable', async () => {
  const onDone = jest.fn();
  await renderWithQuery(
    <PeopleSheet people={[]} phones={[]} maxUsers={null} onDone={onDone} onClose={jest.fn()} />,
  );
  const field = screen.getByLabelText(P.notOnPlatform);
  await fireEvent.changeText(field, '12');
  await fireEvent.press(screen.getByRole('button', { name: F.add }));
  expect(screen.getByText(t.shortLinks.gate.errors.invalid_phone)).toBeTruthy();
  await fireEvent.changeText(field, '+20 100 000 0001');
  await fireEvent.press(screen.getByRole('button', { name: F.add }));
  expect(screen.queryByText(t.shortLinks.gate.errors.invalid_phone)).toBeNull();
  expect(screen.getByText(F.unregistered)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: P.done.replace('{n}', '1') }));
  expect(onDone).toHaveBeenLastCalledWith({ people: [], phones: ['+201000000001'] });
  const remove = F.remove.replace('{name}', formatPhone('+201000000001'));
  await fireEvent.press(screen.getByRole('button', { name: remove }));
  expect(screen.queryByText(F.unregistered)).toBeNull();
});
