import { roleKey, type LinkPick } from '@ab/client-core';
import { Pressable, View } from 'react-native';
import { shape, type, useTheme, AppText } from '@ab/mobile-kit';
import { PersonRow } from '@/short-links/ui/PersonRow';

interface PersonPickProps {
  person: LinkPick;
  picked: boolean;
  onToggle: (person: LinkPick) => void;
}

function Box({ on }: { on: boolean }) {
  const { color } = useTheme();
  const edge = on ? color.lapisFill : color.ruleInput;
  return (
    <View
      style={{
        width: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: shape.radius.sm,
        borderWidth: 1.5,
        borderColor: edge,
        backgroundColor: on ? color.lapisFill : 'transparent',
      }}
    >
      {on ? (
        <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.xs, color: color.onLapis }}>
          ✓
        </AppText>
      ) : null}
    </View>
  );
}

/** A system user in the picker: a checkbox row, by name and role (board LinkXStaffPeople). */
export function PersonPick({ person, picked, onToggle }: PersonPickProps) {
  const role = roleKey(person.role);
  const look = { name: person.name, role, phone: null, matched: false, unregistered: false };
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={person.name}
      accessibilityState={{ checked: picked }}
      onPress={() => onToggle(person)}
    >
      <PersonRow look={look} id={person.id} trailing={<Box on={picked} />} />
    </Pressable>
  );
}
