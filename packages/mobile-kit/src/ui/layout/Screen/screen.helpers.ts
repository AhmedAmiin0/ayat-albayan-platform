import type { Edge } from 'react-native-safe-area-context';

const BODY = { paddingHorizontal: 16, paddingTop: 8, gap: 16 } as const;
/** A chat, and a list screen's header blocks (title, search, pills): the tight 8pt rhythm. */
const TIGHT_BODY = { paddingHorizontal: 16, paddingTop: 8, gap: 8 } as const;

const ALL_EDGES: readonly Edge[] = ['top', 'bottom'];
const TOP_EDGE: readonly Edge[] = ['top'];

/** A chat or a screen above the tabs owns the bottom safe area too. */
export const edgesOf = (ownsBottom: boolean) => (ownsBottom ? ALL_EDGES : TOP_EDGE);

export const scrollStyle = (inset: number) => ({ ...BODY, paddingBottom: 24 + inset });

/** A tight body's list runs under the bar and pads itself, so the frame adds nothing. */
export const bodyStyle = (tight: boolean, inset: number) =>
  tight ? { flex: 1, ...TIGHT_BODY, paddingBottom: 0 } : { flex: 1, ...BODY, paddingBottom: inset };
