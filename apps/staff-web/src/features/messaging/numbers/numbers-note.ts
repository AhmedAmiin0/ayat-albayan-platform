import { createContext, useContext } from 'react';

/** The settings page's toast (`onNote`), shared by every write inside «الأرقام». */
export const NumbersNote = createContext<(message: string) => void>(() => undefined);

export const useNumbersNote = () => useContext(NumbersNote);
