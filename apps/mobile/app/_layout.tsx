import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerBackTitle: 'Quay lại' }}>
        <Stack.Screen name="index" options={{ title: 'Mandarin AI — M0' }} />
        <Stack.Screen name="spikes/ink" options={{ title: 'Spike: viết tay 山' }} />
        <Stack.Screen name="spikes/audio" options={{ title: 'Spike: ghi âm & Azure' }} />
        <Stack.Screen name="spikes/realtime" options={{ title: 'Spike: OpenAI Realtime auth' }} />
        <Stack.Screen name="spikes/secure-db" options={{ title: 'Spike: SQLCipher + Keychain' }} />
      </Stack>
    </>
  );
}
