import { createContext, useContext } from 'react';

export const NumbersNote = createContext<(message: string) => void>(() => undefined);

export const useNumbersNote = () => useContext(NumbersNote);
