// Vitest setup (vitest.config.mts): an invented teacher directory, so tests never need the
// owner's git-ignored cache/teachers.json. Single first names match the export's tab names
// (HEART ABRAR/RABIA/HEND); every full name here is made up.
import { setTeacherDirectory } from './sources/teachers.dir.ts';

export const TEST_TEACHERS = {
  names: {
    abrar: 'أبرار',
    rabia: 'ربيعة',
    hassan: 'حسن',
    hend: 'هند',
    'mariam adel': 'مريم عادل',
  },
  aliases: {
    أبرار: 'abrar',
    'أبرار سالم': 'abrar',
    ربيعه: 'rabia',
    'ربيعه منصور': 'rabia',
    'حسن كامل': 'hassan',
    هند: 'hend',
  },
};

setTeacherDirectory(TEST_TEACHERS);
