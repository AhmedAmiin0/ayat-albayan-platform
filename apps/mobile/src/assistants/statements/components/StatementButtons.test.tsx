import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@/theme';
import { statement } from '../../api/fixtures';
import { StatementButtons } from './StatementButtons';

const CAN = { read: true, write: true, approve: true };
const styleOf = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);

test('docs/07 «الأزرار»: a paid statement\'s actions as one ButtonRow, «إلغاء الدفع» the danger one', async () => {
  await render(<StatementButtons statement={statement({ status: 'paid', has_receipt: true })} can={CAN} linesOpen={false} onAction={jest.fn()} />);
  expect(screen.getAllByTestId('button-row-cell')).toHaveLength(3);
  expect(styleOf(t.finance.unpay)).toMatchObject({ borderWidth: 1, borderColor: palette.light.bad });
  expect(styleOf(t.assistants.statements.details)).toMatchObject({ borderWidth: 1, borderColor: palette.light.ruleInput });
});

test('an approved one: pay | reopen | details, all outlined (no ghost beside them)', async () => {
  await render(<StatementButtons statement={statement({ status: 'approved' })} can={CAN} linesOpen={false} onAction={jest.fn()} />);
  expect(screen.getAllByTestId('button-row-cell')).toHaveLength(3);
  for (const name of [t.payouts.markPaid, t.finance.reopen, t.assistants.statements.details]) {
    expect(styleOf(name)).toMatchObject({ borderWidth: 1, borderColor: palette.light.ruleInput });
  }
});
