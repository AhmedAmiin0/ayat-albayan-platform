import { useState } from 'react';

export function usePasswordInput() {
  const [shown, setShown] = useState(false);
  return { shown, setShown };
}
