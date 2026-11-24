import { createDefaultQuizTypeRegistry } from '@mandarin/domain';
import * as Device from 'expo-device';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Text } from 'react-native';
import { API_BASE_URL, api } from '../src/api/client';
import { Mono, Para, Screen } from '../src/components/ui';
import { getDigitalInk } from '../src/native/digitalInk';

const quizTypes = createDefaultQuizTypeRegistry().list();

export default function Home() {
  const [health, setHealth] = useState<string>('đang kiểm tra…');
  useEffect(() => {
    api
      .health()
      .then((h) =>
        setHealth(
          `OK v${h.version} · OpenAI: ${h.providers.openaiRealtime} · Azure: ${h.providers.azureSpeech}`,
        ),
      )
      .catch((e: unknown) => setHealth(`không kết nối được (${String(e)})`));
  }, []);

  return (
    <Screen>
      <Para>
        Bản dựng phát triển M0 — chỉ dùng để kiểm tra tính khả thi của các tích hợp native. Kết quả
        gắn nhãn MOCK là giả lập, không phải tích hợp thật.
      </Para>
      <Mono>
        {`Thiết bị: ${Device.modelName ?? '?'} · ${Platform.OS} ${String(Platform.Version)} · ${Device.isDevice ? 'máy thật' : 'simulator'}\n`}
        {`API: ${API_BASE_URL}\nHealth: ${health}\n`}
        {`Digital Ink native: ${getDigitalInk().mode === 'live' ? 'đã link' : 'CHƯA link (MOCK)'}\n`}
        {`QuizType: ${quizTypes.length} loại (${quizTypes.map((q) => q.id).join(', ')})`}
      </Mono>
      <Link href="/spikes/ink">
        <Text style={{ fontSize: 17 }}>1. Viết tay 山 (ML Kit Digital Ink) ›</Text>
      </Link>
      <Link href="/spikes/audio">
        <Text style={{ fontSize: 17 }}>2. Ghi âm tiếng Trung + chấm Azure ›</Text>
      </Link>
      <Link href="/spikes/realtime">
        <Text style={{ fontSize: 17 }}>3. OpenAI Realtime — cấp client secret ›</Text>
      </Link>
      <Link href="/spikes/secure-db">
        <Text style={{ fontSize: 17 }}>4. SQLite mã hóa (SQLCipher + Keychain) ›</Text>
      </Link>
    </Screen>
  );
}
