import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { TodayScreen } from '../screens/TodayScreen';
import { yusuf } from './fixtures';

// Today through its details sheet (docs/29): open the screen, then a lesson's «تفاصيل الحلقة».
// 16:20 Riyadh in the tests: pending (16:00, يوسف) runs and is the hero; muscat (17:00, جنى) is a row.

const { openLesson } = t.today;
/** What a row's spoken name puts between the time and the names («، »). */
const timeToNames = openLesson.slice('{time}'.length, openLesson.indexOf('{names}'));

export async function openToday() {
  await renderWithQuery(<TodayScreen />);
  await screen.findByText(yusuf.name);
}

/** Opens «تفاصيل الحلقة» from the hero, or from a row by its students. */
export async function openSheet(names?: string) {
  const target = names
    ? screen.getByRole('button', { name: new RegExp(`^\\d\\d:\\d\\d${timeToNames}${names}`) })
    : screen.getByRole('button', { name: t.today.details });
  await fireEvent.press(target);
  await screen.findByRole('header', { name: names ?? yusuf.name });
}

/** A sheet action's spoken name: «إلغاء — يوسف أحمد». */
export const inSheet = (label: string, who = yusuf.name) => ({ name: `${label} — ${who}` });
