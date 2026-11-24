import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export function Screen({ children }: { children: ReactNode }) {
  return <ScrollView contentContainerStyle={styles.screen}>{children}</ScrollView>;
}

export function Button({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.buttonDim]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.mono} selectable>
      {children}
    </Text>
  );
}

export function Para({ children }: { children: ReactNode }) {
  return <Text style={styles.para}>{children}</Text>;
}

/** Dev-only field for a Supabase access token until login ships in M1. */
export function TokenField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.para}>Access token (dev, tạm thời đến M1):</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        placeholder="eyJ…"
        style={styles.input}
        accessibilityLabel="Access token"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 14 },
  button: {
    backgroundColor: '#1F5FAD',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonDim: { opacity: 0.6 },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  mono: { fontFamily: 'Menlo', fontSize: 12 },
  para: { fontSize: 15, lineHeight: 21 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 10, fontSize: 14 },
});
