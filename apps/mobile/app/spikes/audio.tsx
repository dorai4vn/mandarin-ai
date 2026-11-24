import type { PronunciationAssessmentResult } from '@mandarin/contracts';
import {
  AudioQuality,
  IOSOutputFormat,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useState } from 'react';
import { Linking } from 'react-native';
import { api, ApiCallError } from '../../src/api/client';
import { StatusBadge } from '../../src/components/StatusBadge';
import { Button, Mono, Para, Screen, TokenField } from '../../src/components/ui';
import { labelForResult } from '../../src/lib/status';

const REFERENCE = '你好';

/** WAV / PCM 16 kHz / 16-bit / mono — the format the Azure short-audio REST API expects. */
const WAV_16K_MONO: RecordingOptions = {
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  ios: {
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: { extension: '.wav', outputFormat: 'default', audioEncoder: 'default' },
  web: {},
};

export default function AudioSpike() {
  const recorder = useAudioRecorder(WAV_16K_MONO);
  const state = useAudioRecorderState(recorder);
  const [uri, setUri] = useState<string | null>(null);
  const player = useAudioPlayer(uri ? { uri } : null);
  const [permission, setPermission] = useState<string>('chưa hỏi');
  const [fileInfo, setFileInfo] = useState<string>('');
  const [token, setToken] = useState('');
  const [assessment, setAssessment] = useState<PronunciationAssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setError(null);
    const perm = await requestRecordingPermissionsAsync();
    setPermission(
      perm.granted ? 'đã cấp' : perm.canAskAgain ? 'bị từ chối' : 'bị từ chối vĩnh viễn',
    );
    if (!perm.granted) return;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stop = async () => {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    const recorded = recorder.uri;
    setUri(recorded);
    if (recorded) {
      const f = new File(recorded);
      setFileInfo(`file=${recorded.split('/').pop()} size=${f.size ?? '?'} bytes`);
    }
  };

  const assess = async () => {
    if (!uri) return;
    setError(null);
    setAssessment(null);
    try {
      const audioBase64 = await new File(uri).base64();
      setAssessment(
        await api.assessPronunciation(token.trim(), {
          referenceText: REFERENCE,
          locale: 'zh-CN',
          audioBase64,
        }),
      );
    } catch (e) {
      // The recording is kept on failure (PRD-06: assessment failure must not erase it).
      setError(e instanceof ApiCallError ? `${e.status} ${e.code}` : String(e));
    }
  };

  const discard = () => {
    // D-011: do not keep raw audio on device longer than needed.
    if (uri) new File(uri).delete();
    setUri(null);
    setFileInfo('');
    setAssessment(null);
  };

  return (
    <Screen>
      <Para>Đọc to câu mẫu: {REFERENCE} (nǐ hǎo)</Para>
      <Mono>{`Quyền micro: ${permission}\nĐang ghi: ${state.isRecording ? 'có' : 'không'} · ${Math.round(state.durationMillis / 100) / 10}s\n${fileInfo}`}</Mono>
      {permission.startsWith('bị từ chối') && (
        <Button title="Mở Cài đặt để cấp quyền micro" onPress={() => void Linking.openSettings()} />
      )}
      {!state.isRecording ? (
        <Button title="Bắt đầu ghi" onPress={start} />
      ) : (
        <Button title="Dừng" onPress={stop} />
      )}
      <Button
        title="Nghe lại"
        onPress={() => {
          player.seekTo(0);
          player.play();
        }}
        disabled={!uri}
      />
      <TokenField value={token} onChange={setToken} />
      <Button title="Gửi chấm phát âm (API → Azure)" onPress={assess} disabled={!uri || !token} />
      <StatusBadge label={labelForResult(assessment?.source ?? null, error)} />
      {assessment && (
        <Mono>
          {`status=${assessment.recognitionStatus} text=${assessment.recognizedText ?? '—'}\n`}
          {Object.entries(assessment.scores)
            .map(([k, v]) => `${k}: ${v ?? 'không có (provider không trả về)'}`)
            .join('\n')}
        </Mono>
      )}
      <Button title="Xóa bản ghi khỏi máy" onPress={discard} disabled={!uri} />
    </Screen>
  );
}
