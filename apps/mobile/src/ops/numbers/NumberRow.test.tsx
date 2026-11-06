import type { NumberView } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { numbers } from './numbers-fixtures';
import { NumberRow } from './NumberRow';

const n = t.numbers;
const [main] = numbers;
if (!main) throw new Error('fixture needs a number');

const evolution: NumberView = {
  ...main,
  provider: 'evolution',
  phone_number_id: 'academy-staff',
  evolution: { mode: 'baileys', auto_sends: false, state: 'open', state_at: null },
};

test('the row names its driver, read-only', async () => {
  await renderWithQuery(<NumberRow number={main} />);
  expect(screen.getByText(`${n.fields.provider}: ${n.provider.meta}`)).toBeTruthy();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});

test('an Evolution number reads «Evolution»', async () => {
  await renderWithQuery(<NumberRow number={evolution} />);
  expect(screen.getByText(`${n.fields.provider}: ${n.provider.evolution}`)).toBeTruthy();
});
