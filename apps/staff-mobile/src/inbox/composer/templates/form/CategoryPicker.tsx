import { AUTHOR_CATEGORIES, type AuthorCategory } from '@ab/shared';
import { t, FilterPills, AppText, type, useTheme, Section } from '@ab/mobile-kit';

interface CategoryPickerProps {
  value: AuthorCategory;
  onChange: (value: AuthorCategory) => void;
}

/** Guessed from the text (an offer is marketing) until the author picks. */
export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { color } = useTheme();
  const words = t.templates.author.categories;
  const items = AUTHOR_CATEGORIES.map((c) => ({ value: c, label: words[c] }));
  return (
    <Section title={t.templates.create.category}>
      <FilterPills
        items={items}
        value={value}
        onChange={onChange}
        accessibilityLabel={t.templates.create.category}
        role="radiogroup"
        wrap
      />
      <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>
        {t.templates.author.categoryHint}
      </AppText>
    </Section>
  );
}
