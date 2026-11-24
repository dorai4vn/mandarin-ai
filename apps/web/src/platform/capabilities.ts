/**
 * Runtime feature detection (D-028): never infer support from the user agent.
 * `env` is injectable so the logic is unit-testable outside a browser.
 */
export type CapabilityId =
  | 'secureContext'
  | 'pointerEvents'
  | 'microphone'
  | 'audioWorklet'
  | 'mediaRecorder'
  | 'indexedDb'
  | 'serviceWorker'
  | 'cacheStorage'
  | 'webPush'
  | 'persistentStorage'
  | 'fileUpload'
  | 'webRtc'
  | 'installedMode';

export type CapabilityState = 'supported' | 'unsupported' | 'partial';

export interface Capability {
  id: CapabilityId;
  label: string;
  state: CapabilityState;
  /** Vietnamese explanation shown to learners when not fully supported. */
  note: string;
  /** Core = needed for some core feature; enhancement = optional (PWA, push, offline). */
  kind: 'core' | 'enhancement';
}

/** Minimal shape of `window` the detector reads. */
export interface DetectEnv {
  isSecureContext?: boolean;
  PointerEvent?: unknown;
  navigator?: {
    mediaDevices?: { getUserMedia?: unknown };
    serviceWorker?: unknown;
    storage?: { persist?: unknown };
  };
  AudioWorkletNode?: unknown;
  MediaRecorder?: { isTypeSupported?: (t: string) => boolean };
  indexedDB?: unknown;
  caches?: unknown;
  PushManager?: unknown;
  Notification?: unknown;
  File?: unknown;
  FileReader?: unknown;
  RTCPeerConnection?: unknown;
  matchMedia?: (q: string) => { matches: boolean };
}

const has = (v: unknown) => v !== undefined && v !== null;

export function recorderMimeTypes(env: DetectEnv): string[] {
  const candidates = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/wav'];
  const fn = env.MediaRecorder?.isTypeSupported;
  if (!fn) return [];
  return candidates.filter((t) => {
    try {
      return fn.call(env.MediaRecorder, t);
    } catch {
      return false;
    }
  });
}

export function detectCapabilities(env: DetectEnv): Capability[] {
  const secure = env.isSecureContext === true;
  const installed =
    env.matchMedia?.('(display-mode: standalone)').matches === true ||
    env.matchMedia?.('(display-mode: minimal-ui)').matches === true;
  const mic = has(env.navigator?.mediaDevices?.getUserMedia);
  const sw = has(env.navigator?.serviceWorker);
  const push = has(env.PushManager) && has(env.Notification) && sw;
  const mimes = recorderMimeTypes(env);

  const row = (
    id: CapabilityId,
    label: string,
    ok: boolean,
    note: string,
    kind: Capability['kind'],
    partial = false,
  ): Capability => ({
    id,
    label,
    state: ok ? (partial ? 'partial' : 'supported') : 'unsupported',
    note: ok && !partial ? '' : note,
    kind,
  });

  return [
    row(
      'secureContext',
      'Kết nối bảo mật (HTTPS)',
      secure,
      'Micro và chế độ offline cần HTTPS.',
      'core',
    ),
    row(
      'pointerEvents',
      'Pointer Events (chạm, chuột, bút)',
      has(env.PointerEvent),
      'Trình duyệt quá cũ: khung viết chữ Hán không dùng được.',
      'core',
    ),
    row(
      'microphone',
      'Micro (getUserMedia)',
      mic && secure,
      secure ? 'Trình duyệt không hỗ trợ ghi âm.' : 'Cần HTTPS để dùng micro.',
      'core',
    ),
    row(
      'audioWorklet',
      'Xử lý âm thanh (AudioWorklet)',
      has(env.AudioWorkletNode),
      'Sẽ dùng chế độ xử lý dự phòng (chậm hơn).',
      'core',
    ),
    row(
      'mediaRecorder',
      'MediaRecorder',
      has(env.MediaRecorder),
      'Không bắt buộc: ứng dụng tự tạo WAV từ âm thanh thô.',
      'enhancement',
      has(env.MediaRecorder) && mimes.length === 0,
    ),
    row(
      'indexedDb',
      'Lưu trữ offline (IndexedDB)',
      has(env.indexedDB),
      'Không lưu được offline; ứng dụng vẫn chạy khi có mạng.',
      'enhancement',
    ),
    row(
      'serviceWorker',
      'Service worker',
      sw && secure,
      'Không có chế độ mở khi mất mạng; mọi tính năng online vẫn dùng được.',
      'enhancement',
    ),
    row(
      'cacheStorage',
      'Cache Storage',
      has(env.caches),
      'Không có bộ nhớ đệm offline.',
      'enhancement',
    ),
    row(
      'webPush',
      'Thông báo đẩy (Web Push)',
      push,
      'Không hỗ trợ ở trình duyệt/chế độ này (trên iPhone/iPad cần thêm vào Màn hình chính, iOS 16.4+). Nhắc học vẫn hiện trong ứng dụng.',
      'enhancement',
    ),
    row(
      'persistentStorage',
      'Xin giữ dữ liệu lâu dài',
      has(env.navigator?.storage?.persist),
      'Trình duyệt có thể tự xóa dữ liệu offline khi thiếu dung lượng.',
      'enhancement',
    ),
    row(
      'fileUpload',
      'Tải tệp lên (File API)',
      has(env.File) && has(env.FileReader),
      'Không tải được PDF lên.',
      'core',
    ),
    row(
      'webRtc',
      'WebRTC (hội thoại giọng nói thời gian thực)',
      has(env.RTCPeerConnection),
      'Hội thoại thời gian thực không khả dụng; dùng chế độ lượt lời.',
      'enhancement',
    ),
    {
      id: 'installedMode',
      label: 'Đang chạy như ứng dụng đã cài',
      state: installed ? 'supported' : 'unsupported',
      note: installed ? '' : 'Đang chạy trong tab trình duyệt — bình thường, không cần cài đặt.',
      kind: 'enhancement',
    },
  ];
}

/** Core features that are missing → the UI shows a compatibility notice (never blocks the rest). */
export function missingCore(caps: Capability[]): Capability[] {
  return caps.filter(
    (c) => c.kind === 'core' && c.state === 'unsupported' && c.id !== 'audioWorklet',
  );
}
