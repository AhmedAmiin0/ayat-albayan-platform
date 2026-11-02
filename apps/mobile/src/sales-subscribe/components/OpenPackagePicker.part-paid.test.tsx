import { render, screen } from '@testing-library/react-native';
import { partPaidLine } from '@/core/lib/money/format';
import { dueText } from '@/sales-subscribe/lib/package-text';
import { openSub } from '@/sales-subscribe/testing/fixtures';
import { OpenPackagePicker } from './OpenPackagePicker';

// Owner 2026-10-28: her owed package of 81 with 80 received says what was paid, not only what is due.
test('80 of 81: the part-paid line', async () => {
  const sub = openSub({ price: 81, paid: 80, due: 1 });
  await render(<OpenPackagePicker packages={[sub]} value={sub} onChange={jest.fn()} />);
  expect(screen.getByText(partPaidLine(sub) ?? '')).toBeTruthy();
  expect(screen.queryByText(dueText(sub))).toBeNull();
});

test('nothing paid yet: «المتبقي: 180 ر.س»', async () => {
  const sub = openSub();
  await render(<OpenPackagePicker packages={[sub]} value={sub} onChange={jest.fn()} />);
  expect(screen.getByText(dueText(sub))).toBeTruthy();
});
