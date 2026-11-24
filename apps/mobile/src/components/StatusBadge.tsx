import { StyleSheet, Text, View } from 'react-native';
import type { labelForResult } from '../lib/status';

type Label = ReturnType<typeof labelForResult>;

const COLORS: Record<Label['status'], string> = {
  VERIFIED: '#1B7F3B',
  LIVE_UNCONFIRMED: '#1F5FAD',
  MOCKED: '#B26A00',
  BLOCKED: '#B3261E',
  UNTESTED: '#5F6368',
};

export function StatusBadge({ label }: { label: Label }) {
  return (
    <View
      style={[styles.badge, { borderColor: COLORS[label.status] }]}
      accessibilityRole="text"
      accessibilityLabel={`Trạng thái: ${label.text}`}
    >
      <Text style={[styles.text, { color: COLORS[label.status] }]}>{label.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  text: { fontWeight: '600', fontSize: 14 },
});
