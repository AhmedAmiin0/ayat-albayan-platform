import type { SettingKey, SettingMeta } from '@ab/shared';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { t, shape, useTheme, ScreenHeader } from '@ab/mobile-kit';
import type { AppTextNode } from '@ab/mobile-kit';
import { useValueSheet } from '@/ops/values/hooks/use-value-sheet';
import { DescriptionEditor } from './DescriptionEditor';
import { useSheetDescription, type SheetDescription } from '@/ops/values/hooks/use-description-editor';
import { ValueSheetBody } from './ValueSheetBody';
import { labelOf } from '@/ops/values/lib/value-text';

interface ValueSheetProps {
  valueKey: SettingKey;
  saved: unknown;
  canWrite: boolean;
  meta: SettingMeta | undefined;
  onSaved: () => void;
  onClose: () => void;
  /** A description was saved or restored: the screen shows the message (the toast line). */
  onDescribed?: (message: string) => void;
}

interface DescribingProps {
  valueKey: SettingKey;
  description: SheetDescription;
  onDone: (message: string) => void;
  onCancel: () => void;
}

/** Screen-reader focus moves to the title so the mode change is announced. */
function Describing({ valueKey, description, onDone, onCancel }: DescribingProps) {
  const titleRef = useRef<AppTextNode>(null);
  useEffect(() => {
    if (titleRef.current) AccessibilityInfo.sendAccessibilityEvent(titleRef.current, 'focus');
  }, []);
  return (
    <View style={{ gap: 12 }}>
      <ScreenHeader size="h2" title={t.mobileValues.description.title} subtitle={labelOf(valueKey)} titleRef={titleRef} />
      <DescriptionEditor
        valueKey={valueKey}
        initial={description.text ?? ''}
        edited={description.entry?.descriptionEdited === true}
        onDone={onDone}
        onCancel={onCancel}
      />
    </View>
  );
}

/** Unsaved edits always ask first; the scrim is hidden from readers so controls stay separate. */
export function ValueSheet(props: ValueSheetProps) {
  const { valueKey, saved, canWrite, meta, onSaved, onClose } = props;
  const { color } = useTheme();
  const sheet = useValueSheet({ valueKey, saved, onSaved, onClose });
  const description = useSheetDescription(valueKey);
  const [describing, setDescribing] = useState(false);
  // While the description editor is open, the back gesture and the scrim return to the value.
  const back = describing ? () => setDescribing(false) : sheet.requestClose;
  const described = (message: string) => {
    setDescribing(false);
    props.onDescribed?.(message);
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={back}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          testID="value-sheet-scrim"
          accessible={false}
          importantForAccessibility="no"
          onPress={back}
          style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]}
        />
        <View
          testID="value-sheet"
          accessibilityViewIsModal
          style={{
            maxHeight: '90%',
            borderTopLeftRadius: shape.radius.lg,
            borderTopRightRadius: shape.radius.lg,
            backgroundColor: color.raised,
          }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            {describing ? (
              <Describing
                valueKey={valueKey}
                description={description}
                onDone={described}
                onCancel={() => setDescribing(false)}
              />
            ) : (
              <ValueSheetBody
                {...{ valueKey, saved, canWrite, meta, sheet, description }}
                onDescribe={() => setDescribing(true)}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
