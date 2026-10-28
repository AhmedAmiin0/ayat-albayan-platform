import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@/theme';
import { message } from '../../shared/thread-fixtures';
import { ReactorsSheet } from './ReactorsSheet';

test('docs/07 «الأزرار»: «إزالة» on our reaction is the outlined danger button, «إغلاق» outlined', async () => {
  const m = message({ id: 'm1', reactions: { theirs: null, ours: '👍', ours_by: 'هبة' } });
  await render(<ReactorsSheet message={m} contact="أم يوسف" onRemove={jest.fn()} onClose={jest.fn()} />);
  const remove = screen.getByRole('button', { name: t.inbox.reactions.removeLabel.replace('{emoji}', '👍') });
  expect(StyleSheet.flatten(remove.props.style)).toMatchObject({ borderWidth: 1, borderColor: palette.light.bad });
  const close = screen.getByRole('button', { name: t.common.close });
  expect(StyleSheet.flatten(close.props.style)).toMatchObject({ borderColor: palette.light.ruleInput });
});
