import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';

interface SearchFieldProps {
  /** Called with the trimmed text once typing pauses (and at once on the keyboard's search key). */
  onSearch: (q: string) => void;
  initial?: string;
  /** Placeholder and screen-reader name; defaults to «بحث». */
  label?: string;
  delayMs?: number;
  /**
   * The list screens' pill (the chats list as WhatsApp, every list header since owner 2026-10-28): 44pt,
   * a grey fill and a hairline edge in place of the heavy border. Text stays 16pt (no iOS zoom).
   */
  compact?: boolean;
}

type Theme = ReturnType<typeof useTheme>;

/** The box: the 44pt bordered field, or the compact pill (WhatsApp's grey fill and a hairline edge). */
const boxStyle = ({ color, glass }: Theme, compact: boolean) =>
  compact
    ? {
        minHeight: shape.control.touch,
        paddingHorizontal: 16,
        borderRadius: shape.radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: color.ruleInput,
        backgroundColor: glass.pill.fill,
      }
    : {
        minHeight: shape.control.touch,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: color.ruleInput,
        borderRadius: shape.radius.md,
        backgroundColor: color.raised,
      };

/** 16pt search input (no iOS zoom), 44pt tall (or the compact pill), debounced. Put the query into usePagedList params.q. */
export function SearchField({
  onSearch,
  initial = '',
  label = t.common.search,
  delayMs = 300,
  compact = false,
}: SearchFieldProps) {
  const theme = useTheme();
  const { color } = theme;
  const [text, setText] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (value: string) => {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(value.trim()), delayMs);
  };
  const submit = () => {
    clearTimeout(timer.current);
    onSearch(text.trim());
  };

  return (
    <TextInput
      accessibilityRole="search"
      accessibilityLabel={label}
      placeholder={label}
      placeholderTextColor={color.ink3}
      value={text}
      onChangeText={change}
      onSubmitEditing={submit}
      returnKeyType="search"
      clearButtonMode="while-editing"
      autoCorrect={false}
      autoCapitalize="none"
      style={{
        ...boxStyle(theme, compact),
        color: color.ink,
        fontFamily: type.ui[400],
        fontSize: type.size.base,
      }}
    />
  );
}
