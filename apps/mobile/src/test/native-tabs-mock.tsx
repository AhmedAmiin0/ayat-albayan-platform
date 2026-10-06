// Jest stand-in for expo-router/unstable-native-tabs: the native tab bar (UITabBar / Material) has no
// JS buttons for a test to press, so tests get the same tabs as JS tab buttons named by their label.
// The app itself always renders the real NativeTabs.
import { Tabs } from 'expo-router';
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';

interface TriggerProps {
  name: string;
  hidden?: boolean;
  children?: ReactNode;
}

// Markers only: the mock reads the Label's text and ignores icons and badges.
const Label: (props: { children?: ReactNode }) => null = () => null;
const Icon: (props: object) => null = () => null;
const Badge: (props: object) => null = () => null;

function labelOf(children: ReactNode): string | undefined {
  const label = Children.toArray(children).find((c) => isValidElement(c) && c.type === Label);
  if (!isValidElement<{ children?: ReactNode }>(label)) return undefined;
  return typeof label.props.children === 'string' ? label.props.children : undefined;
}

const TriggerBase: (props: TriggerProps) => null = () => null;
const Trigger = Object.assign(TriggerBase, { Label, Icon, Badge, VectorIcon: Icon });

function NativeTabsMock({ children }: { children?: ReactNode }) {
  const triggers = Children.toArray(children).filter(isValidElement) as ReactElement<TriggerProps>[];
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      {triggers.map(({ props }) => {
        const title = labelOf(props.children);
        return <Tabs.Screen key={props.name} name={props.name} options={{ title, tabBarAccessibilityLabel: title, href: props.hidden ? null : undefined }} />;
      })}
    </Tabs>
  );
}

export const NativeTabs = Object.assign(NativeTabsMock, { Trigger, BottomAccessory: Badge });
