import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import { DetailsHead } from './DetailsHead';

const AHEAD = '2099-10-01T14:00:00.000Z';

describe('DetailsHead — «أكّد المعلم الحضور» (docs/46 C4)', () => {
  it('shows the chip once the teacher said «سأحضر»', async () => {
    const said = lesson({ id: 'l1', starts_at: AHEAD, teacher_confirmed_at: AHEAD });
    await renderWithQuery(<DetailsHead lesson={said} />);
    expect(screen.getByText(t.teacherBoard.teacherConfirmed)).toBeTruthy();
  });

  it('nothing before she confirms', async () => {
    await renderWithQuery(<DetailsHead lesson={lesson({ id: 'l1', starts_at: AHEAD })} />);
    expect(screen.queryByText(t.teacherBoard.teacherConfirmed)).toBeNull();
  });
});
