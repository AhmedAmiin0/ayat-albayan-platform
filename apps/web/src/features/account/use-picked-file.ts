import { useCallback, useEffect, useRef, useState } from 'react';

export interface PickedFile {
  file: File;
  /** A local object URL for the preview. */
  url: string;
}

/** The picked photo and its local preview URL (R-ACC-05), revoked when replaced or on unmount. */
export function usePickedFile(): readonly [PickedFile | null, (file: File | null) => void] {
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const current = useRef<PickedFile | null>(null);
  useEffect(
    () => () => {
      if (current.current) URL.revokeObjectURL(current.current.url);
    },
    [],
  );
  const replace = useCallback((file: File | null) => {
    if (current.current) URL.revokeObjectURL(current.current.url);
    current.current = file ? { file, url: URL.createObjectURL(file) } : null;
    setPicked(current.current);
  }, []);
  return [picked, replace] as const;
}
