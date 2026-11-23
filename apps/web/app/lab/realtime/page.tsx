'use client';
import type { RealtimeSessionGrant } from '@mandarin/contracts';
import { useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { Button, Card, Mono, PageHeader } from '@/components/ui';
import { api, describeApiError } from '@/lib/api-client';
import { labelForResult } from '@/lib/status';

/** D-004: auth/feasibility only — the browser never sees the OpenAI API key. */
export default function RealtimeLab() {
  const [grant, setGrant] = useState<RealtimeSessionGrant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const webrtc = typeof window !== 'undefined' && 'RTCPeerConnection' in window;

  const request = async () => {
    setError(null);
    setGrant(null);
    try {
      const g = await api.realtimeSession();
      setGrant(g);
      setSecondsLeft(Math.round((Date.parse(g.expiresAt) - Date.now()) / 1000));
    } catch (e) {
      setError(describeApiError(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Hội thoại thời gian thực"
        lead="Chỉ kiểm tra việc máy chủ cấp khóa tạm thời. Hội thoại giọng nói sẽ làm ở M6 (ưu tiên chế độ lượt lời)."
      />
      <Card>
        <p className="text-sm text-ink-2">
          WebRTC trên trình duyệt này: {webrtc ? 'có' : 'không (sẽ dùng chế độ lượt lời)'}
        </p>
        <Button className="mt-3" onClick={() => void request()} data-testid="realtime-request">
          Xin khóa tạm thời
        </Button>
        <div className="mt-3">
          <StatusBadge label={labelForResult(grant?.source ?? null, error)} />
        </div>
        {grant && (
          <Mono>{`model=${grant.model}\nhết hạn=${grant.expiresAt} (~${secondsLeft}s)\nkhóa=${grant.clientSecret.slice(0, 6)}… (đã che)`}</Mono>
        )}
      </Card>
    </>
  );
}
