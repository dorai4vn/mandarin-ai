import { ZH_INK_LANGUAGE_TAG, getDigitalInk } from '../../src/native/digitalInk';
import { handwritingType } from '@mandarin/domain';
import type { InkRecognitionResult } from '@mandarin/contracts';
import { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { StatusBadge } from '../../src/components/StatusBadge';
import { Button, Mono, Para, Screen } from '../../src/components/ui';
import { labelForResult } from '../../src/lib/status';
import { StrokeRecorder, strokeToSvgPath } from '../../src/lib/strokes';

const TARGET = '山';

export default function InkSpike() {
  const ink = useMemo(() => getDigitalInk(), []);
  // Stable instance for the screen lifetime (mutable recorder, not React state).
  const [recorder] = useState(() => new StrokeRecorder());
  const [stats, setStats] = useState('');
  const [paths, setPaths] = useState<string[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [result, setResult] = useState<InkRecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const redraw = () => setPaths(recorder.snapshot().map(strokeToSvgPath));
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          recorder.begin(e.nativeEvent.locationX, e.nativeEvent.locationY, e.nativeEvent.timestamp);
          redraw();
        },
        onPanResponderMove: (e) => {
          recorder.move(e.nativeEvent.locationX, e.nativeEvent.locationY, e.nativeEvent.timestamp);
          redraw();
        },
        onPanResponderRelease: () => {
          recorder.end();
          redraw();
        },
        onPanResponderTerminate: () => {
          recorder.end();
          redraw();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const recognize = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const strokes = recorder.completed();
      if (strokes.length === 0) throw new Error('Chưa có nét nào');
      setStats(
        `strokes=${strokes.length} points=${strokes.reduce((n, st) => n + st.points.length, 0)}`,
      );
      if (!(await ink.port.prepareModel(ZH_INK_LANGUAGE_TAG)))
        throw new Error('Không tải được model zh-Hani-CN');
      setResult(
        await ink.port.recognize({ languageTag: ZH_INK_LANGUAGE_TAG, strokes, writingArea: size }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const grade = result
    ? handwritingType.grade({ targetHanzi: TARGET }, { candidates: result.candidates })
    : null;

  return (
    <Screen>
      <Para>
        Gợi ý: “núi” (ngọn núi). Hãy viết chữ Hán tương ứng — đáp án chỉ hiện sau khi gửi.
      </Para>
      <StatusBadge label={labelForResult(result?.source ?? null, error)} />
      {ink.mode === 'mock' && <Para>⚠️ Module native chưa được link: kết quả sẽ là MOCK.</Para>}
      <View
        style={styles.canvas}
        onLayout={(e: LayoutChangeEvent) =>
          setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
        }
        accessibilityLabel="Khung viết tay"
        {...responder.panHandlers}
      >
        <Svg width="100%" height="100%">
          {paths.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke="#111"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
      </View>
      <Button
        title={busy ? 'Đang nhận dạng…' : 'Gửi & nhận dạng'}
        onPress={recognize}
        disabled={busy}
      />
      <Button
        title="Xóa"
        onPress={() => {
          recorder.clear();
          setPaths([]);
          setResult(null);
          setError(null);
        }}
      />
      {result && grade && (
        <>
          <Para>
            {grade.correct
              ? `✅ Đúng! Đáp án: ${TARGET}`
              : `❌ Chưa đúng (${grade.reason}). Đáp án: ${TARGET}`}
          </Para>
          <Mono>
            {`source=${result.source} model=${result.modelId}\n`}
            {result.candidates
              .map((c, i) => `${i + 1}. ${c.text} (score=${c.score ?? 'n/a'})`)
              .join('\n')}
          </Mono>
          <Mono>{stats}</Mono>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  canvas: {
    height: 300,
    borderWidth: 2,
    borderColor: '#888',
    borderRadius: 12,
    backgroundColor: '#FFFDF5',
  },
});
