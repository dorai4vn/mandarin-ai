'use client';
import { useEffect, useState } from 'react';
import { Card, PageHeader } from '@/components/ui';
import { usePwa } from '@/components/PwaProvider';
import { detectCapabilities, recorderMimeTypes, type Capability } from '@/platform/capabilities';

interface EnvInfo {
  viewport: string;
  deviceClass: 'phone' | 'tablet' | 'desktop';
  pointer: string;
  displayMode: string;
  ua: string;
  mimes: string;
}

const STATE_TEXT: Record<Capability['state'], string> = {
  supported: 'Có',
  unsupported: 'Không',
  partial: 'Một phần',
};

export default function LabOverview() {
  const [caps, setCaps] = useState<Capability[]>([]);
  const [env, setEnv] = useState<EnvInfo | null>(null);
  const { swStatus } = usePwa();

  useEffect(() => {
    const w = window.innerWidth;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCaps(detectCapabilities(window as never));
    setEnv({
      viewport: `${w}×${window.innerHeight} @${window.devicePixelRatio}x`,
      deviceClass: w < 768 ? 'phone' : w < 1024 ? 'tablet' : 'desktop',
      pointer: [
        matchMedia('(pointer: coarse)').matches && 'coarse',
        matchMedia('(pointer: fine)').matches && 'fine',
        matchMedia('(hover: hover)').matches && 'hover',
      ]
        .filter(Boolean)
        .join(', '),
      displayMode: matchMedia('(display-mode: standalone)').matches
        ? 'standalone (đã cài)'
        : 'browser (tab)',
      ua: navigator.userAgent,
      mimes: recorderMimeTypes(window as never).join(', ') || '—',
    });
  }, []);

  return (
    <>
      <PageHeader
        title="Phòng thử M0 — khả năng trình duyệt"
        lead="Phát hiện khả năng khi chạy (không dựa vào tên trình duyệt). Mục 'tùy chọn' thiếu không làm ứng dụng ngừng hoạt động."
      />
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card title="Khả năng">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-2 pr-3">Khả năng</th>
                  <th className="py-2 pr-3">Hỗ trợ</th>
                  <th className="py-2 pr-3">Loại</th>
                  <th className="py-2">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {caps.map((c) => (
                  <tr
                    key={c.id}
                    data-testid={`cap-${c.id}`}
                    data-state={c.state}
                    className="border-b border-line/60 align-top"
                  >
                    <td className="py-2 pr-3">{c.label}</td>
                    <td
                      className={`py-2 pr-3 font-semibold ${c.state === 'supported' ? 'text-jade' : c.kind === 'core' ? 'text-error-text' : 'text-amber'}`}
                    >
                      {STATE_TEXT[c.state]}
                    </td>
                    <td className="py-2 pr-3">{c.kind === 'core' ? 'cốt lõi' : 'tùy chọn'}</td>
                    <td className="py-2 text-ink-2">{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Môi trường">
          {env && (
            <dl
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm [&_dd]:[overflow-wrap:anywhere]"
              data-testid="env-info"
              data-device-class={env.deviceClass}
            >
              <dt className="text-ink-2">Viewport</dt>
              <dd>{env.viewport}</dd>
              <dt className="text-ink-2">Lớp thiết bị</dt>
              <dd>{env.deviceClass}</dd>
              <dt className="text-ink-2">Con trỏ</dt>
              <dd>{env.pointer || '—'}</dd>
              <dt className="text-ink-2">Chế độ</dt>
              <dd>{env.displayMode}</dd>
              <dt className="text-ink-2">Service worker</dt>
              <dd>{swStatus}</dd>
              <dt className="text-ink-2">MediaRecorder</dt>
              <dd>{env.mimes}</dd>
              <dt className="text-ink-2">User agent</dt>
              <dd className="break-all text-xs">{env.ua}</dd>
            </dl>
          )}
        </Card>
      </div>
    </>
  );
}
