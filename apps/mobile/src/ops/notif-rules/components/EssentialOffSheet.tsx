import { ESSENTIAL_OFF_TEXT } from '@ab/shared';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { shape, useTheme } from '@/theme';
import type { AppTextNode } from '@/core/ui/primitives/AppText';
import { ButtonRow } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useFocusOnOpen } from '../hooks/use-focus-on-open';

interface EssentialOffSheetProps {
  /** The row's name («تأكيد الحجز وتغيير الموعد»). */
  name: string;
  busy: boolean;
  error: string | undefined;
  onConfirm: (confirmText: string) => void;
  onClose: () => void;
}

/**
 * «اكتب: إيقاف» for an essential row (states.html#mobile): the button stays off until the word is
 * typed exactly (ESSENTIAL_OFF_TEXT), then sends it as confirmText; the API logs the OFF. Not green:
 * the act removes something, so «إيقاف» is the danger button, «إلغاء» (secondary) beside it in one ButtonRow. Mount it only while the question is open. On open the screen reader
 * lands on the title (accessibilityViewIsModal alone is iOS-only).
 */
export function EssentialOffSheet({ name, busy, error, onConfirm, onClose }: EssentialOffSheetProps) {
  const { color } = useTheme();
  const [typed, setTyped] = useState('');
  const title = useRef<AppTextNode>(null);
  useFocusOnOpen(title);
  const r = t.mobileNotificationRules;
  const matches = typed.trim() === ESSENTIAL_OFF_TEXT;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          testID="essential-sheet-scrim"
          accessible={false}
          importantForAccessibility="no"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]}
        />
        <View
          testID="essential-sheet"
          accessibilityViewIsModal
          style={{
            maxHeight: '90%',
            borderTopStartRadius: shape.radius.lg,
            borderTopEndRadius: shape.radius.lg,
            backgroundColor: color.raised,
          }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            <ScreenHeader
              size="h2"
              titleRef={title}
              title={r.essentialTitle.replace('{name}', name)}
              trailing={<Button variant="ghost" label={r.close} onPress={onClose} />}
            />
            <Note>{r.essentialBody}</Note>
            <Field
              label={r.typedLabel.replace('{word}', ESSENTIAL_OFF_TEXT)}
              value={typed}
              onChangeText={setTyped}
              autoCorrect={false}
              autoCapitalize="none"
              autoComplete="off"
            />
            <Note>{r.typedHint}</Note>
            <Note>{r.logLine}</Note>
            {error ? <ErrorLine message={error} /> : null}
            <ButtonRow>
              <Button variant="danger" label={r.turnOff} busy={busy} disabled={!matches} onPress={() => onConfirm(typed.trim())} />
              <Button variant="secondary" label={r.cancel} onPress={onClose} />
            </ButtonRow>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
