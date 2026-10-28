import { templateButtonLink, type TemplateDisplayButton } from '@ab/shared';
import { Linking, Pressable, View, type ViewStyle } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ButtonIcon } from './template-icons';
import { templateButtonHint, templateButtonLabel } from '@ab/client-core';
import { t } from '@/core/lib/i18n/i18n';

const words = t.inbox.templateBubble;

interface RowProps {
  button: TemplateDisplayButton;
  first: boolean;
  /** The bubble's menu: a long press on a link row still opens it. */
  onLongPress?: () => void;
}

function ButtonRow({ button: b, first, onLongPress }: RowProps) {
  const { color } = useTheme();
  const href = templateButtonLink(b);
  const row: ViewStyle = {
    minHeight: shape.control.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: first ? 0 : 1,
    borderTopColor: color.ruleStrong,
  };
  const inner = (
    <>
      <ButtonIcon kind={b.type} color={color.lapis} />
      {/* Wraps instead of clipping: a long Arabic label in an English UI stays whole. */}
      <AppText style={{ flexShrink: 1, textAlign: 'center', fontFamily: type.ui[600], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.lapis }}>
        {templateButtonLabel(b, words)}
      </AppText>
    </>
  );
  if (!href) {
    return (
      <View testID={`template-button-${b.type}`} accessible accessibilityLabel={templateButtonHint(b, words)} style={row}>
        {inner}
      </View>
    );
  }
  return (
    <Pressable
      testID={`template-button-${b.type}`}
      accessibilityRole="link"
      accessibilityLabel={templateButtonHint(b, words)}
      onPress={() => void Linking.openURL(href).catch(() => undefined)}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [row, pressed ? { backgroundColor: color.neutralSoft } : null]}
    >
      {inner}
    </Pressable>
  );
}

/**
 * The buttons right under a template's time, as WhatsApp draws them: rows across the whole bubble split by thin
 * lines, a centred label after its icon. Ours are display-only (the family taps them in WhatsApp);
 * a URL button opens its link. `inset` = the bubble's padding, so the rows reach its edges.
 */
export interface TemplateButtonsProps {
  buttons: readonly TemplateDisplayButton[];
  inset: { x: number; bottom: number };
  onLongPress?: () => void;
}

export function TemplateButtons({ buttons, inset, onLongPress }: TemplateButtonsProps) {
  const { color } = useTheme();
  if (buttons.length === 0) return null;
  return (
    <View testID="template-buttons" style={{ marginHorizontal: -inset.x, marginBottom: -inset.bottom, borderTopWidth: 1, borderTopColor: color.ruleStrong }}>
      {buttons.map((b, i) => (
        <ButtonRow key={`${b.type}-${i}`} button={b} first={i === 0} onLongPress={onLongPress} />
      ))}
    </View>
  );
}
