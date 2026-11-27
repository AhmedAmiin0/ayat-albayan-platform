import { useState } from 'react';

export function usePasswordInput() {
  const [shown, setShown] = useState(false);
  const toggle = () => setShown((s) => !s);
  return { shown, toggle };
}
