import { Children, createContext, Fragment, type ReactNode, useContext } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../../theme';
import { raisedCard } from '../surface';

/** Every group of rows sits in one rounded raised card inside Screen's 16pt gutter. */
const INSET_RADIUS = 20;

const InsetContext = createContext(false);

/**
 * True inside an inset group: a ListRow drops its own fill and bottom rule (the group draws them).
 */
export const useInset = () => useContext(InsetContext);

/** The rule between two rows, inset 16pt from both sides. */
function Rule() {
  const { color } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        marginHorizontal: 16,
        backgroundColor: color.rule,
      }}
    />
  );
}

/** A short static group of rows in the card; null or false children are skipped. */
export function InsetGroup({ children, testID }: { children: ReactNode; testID?: string }) {
  const { color } = useTheme();
  const rows = Children.toArray(children);
  if (rows.length === 0) return null;
  return (
    <InsetContext.Provider value>
      <View
        testID={testID}
        // A border, not raisedCard's outer ring: a scroll view without side padding would clip the
        // ring.
        style={{ ...raisedCard(color, INSET_RADIUS), boxShadow: undefined, borderWidth: StyleSheet.hairlineWidth, borderColor: color.rule, overflow: 'hidden' }}
      >
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <Rule /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </InsetContext.Provider>
  );
}

/** Where a virtualised row sits in its group: the first rounds the top, the last the bottom. */
interface CellPlace {
  first: boolean;
  last: boolean;
}

/**
 * One row's slice of the card in a virtualised list: the fill, the side edges, the rounded ends.
 */
function cellStyle(color: { raised: string; rule: string }, { first, last }: CellPlace): ViewStyle {
  const edge = StyleSheet.hairlineWidth;
  return {
    overflow: 'hidden',
    backgroundColor: color.raised,
    borderColor: color.rule,
    borderLeftWidth: edge,
    borderRightWidth: edge,
    borderTopWidth: first ? edge : 0,
    borderBottomWidth: last ? edge : 0,
    borderTopLeftRadius: first ? INSET_RADIUS : 0,
    borderTopRightRadius: first ? INSET_RADIUS : 0,
    borderBottomLeftRadius: last ? INSET_RADIUS : 0,
    borderBottomRightRadius: last ? INSET_RADIUS : 0,
  };
}

/** A virtualised row inside the card (LazyList / useInsetRows wrap each item in one). */
export function InsetCell({ place, children }: { place: CellPlace; children: ReactNode }) {
  const { color } = useTheme();
  return (
    <InsetContext.Provider value>
      <View testID="inset-cell" style={cellStyle(color, place)}>
        {children}
      </View>
    </InsetContext.Provider>
  );
}

/** Between two virtualised rows: the card's fill and side edges continue, the rule is inset. */
export function InsetSeparator() {
  const { color } = useTheme();
  const edge = StyleSheet.hairlineWidth;
  return (
    <View
      style={{
        backgroundColor: color.raised,
        borderColor: color.rule,
        borderLeftWidth: edge,
        borderRightWidth: edge,
      }}
    >
      <Rule />
    </View>
  );
}
