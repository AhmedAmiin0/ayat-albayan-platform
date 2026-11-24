import type { AuthorTemplate } from '@ab/client-core';
import { isCodeBound } from '@ab/shared';
import { View } from 'react-native';
import { t, StatusChip, ListRow, AppText, type, useTheme } from '@ab/mobile-kit';
import { rejectionOf, statusWord } from './status-words';

interface TemplateItemProps {
  template: AuthorTemplate;
  mine: boolean;
  /** Present only where this user may edit it. */
  onEdit?: () => void;
}

/** A small quiet badge beside the status chip. */
function Badge({ label }: { label: string }) {
  const { color } = useTheme();
  const style = { fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink2 };
  return <AppText style={style}>{label}</AppText>;
}

/** Meta's rejection reason shows under a rejected one. */
export function TemplateItem({ template, mine, onEdit }: TemplateItemProps) {
  const { color } = useTheme();
  const reason = rejectionOf(template);
  const tags = (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <StatusChip {...statusWord(template.status)} size="sm" />
        {mine ? <Badge label={t.templates.author.mine} /> : null}
        {isCodeBound(template.key) ? <Badge label={t.templates.author.codeBound} /> : null}
      </View>
      {reason ? (
        <AppText style={{ fontSize: type.size.xs, color: color.bad }}>
          {t.templates.author.rejectedReason.replace('{reason}', reason)}
        </AppText>
      ) : null}
    </View>
  );
  return (
    <ListRow
      title={template.meta_name}
      subtitle={template.body_ar}
      tags={tags}
      onPress={onEdit}
      accessibilityHint={onEdit ? t.templates.edit.openFor.replace('{name}', template.meta_name) : undefined}
    />
  );
}
