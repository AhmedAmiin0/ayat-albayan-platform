import { useEffect, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';

export interface SearchFieldProps {
  /** Called with the trimmed text once typing pauses (and at once on the keyboard's search key). */
  onSearch: (q: string) => void;
  initial?: string;
  /** Placeholder and screen-reader name; defaults to «بحث». */
  label?: string;
  delayMs?: number;
}

/** 16pt search input (no iOS zoom), 44pt tall, debounced. Put the query into usePagedList params.q. */
export function SearchField({
  onSearch,
  initial = '',
  label = t.common.search,
  delayMs = 300,
}: SearchFieldProps) {
  const { color } = useTheme();
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
        minHeight: shape.control.touch,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: color.ruleInput,
        borderRadius: shape.radius.md,
        backgroundColor: color.raised,
        color: color.ink,
        fontFamily: type.ui[400],
        fontSize: type.size.base,
      }}
    />
  );
}
