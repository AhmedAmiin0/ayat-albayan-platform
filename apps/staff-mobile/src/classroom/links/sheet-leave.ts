import { createContext } from 'react';

/**
 * The page sheet a press sits in (LessonDetailsSheet provides its close): «ادخل الحلقة» closes it
 * before the room opens, else Android keeps the sheet's Modal window above the room. null outside
 * a sheet.
 */
export const SheetLeave = createContext<(() => void) | null>(null);
