import type { RealtimeSessionGrant } from '@mandarin/contracts';
import { useState } from 'react';
import { api, ApiCallError } from '../../src/api/client';
import { StatusBadge } from '../../src/components/StatusBadge';
import { Button, Mono, Para, Screen, TokenField } from '../../src/components/ui';
import { labelForResult } from '../../src/lib/status';

/**
 * D-004: feasibility/auth spike only. The app never holds the OpenAI API key; it asks the
 * backend for a short-lived client secret. No conversation is started in M0.
 */
export default function RealtimeSpike() {
  const [token, setToken] = useState('');
  const [grant, setGrant] = useState<RealtimeSessionGrant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const request = async () => {
    setError(null);
    setGrant(null);
    try {
      const g = await api.realtimeSession(token.trim());
      setGrant(g);
      setSecondsLeft(Math.round((Date.parse(g.expiresAt) - Date.now()) / 1000));
    } catch (e) {
      setError(e instanceof ApiCallError ? `${e.status} ${e.code}` : String(e));
    }
  };

  return (
    <Screen>
      <Para>
        Kiểm tra backend cấp client secret ngắn hạn cho OpenAI Realtime. Không bắt đầu hội thoại
        trong M0.
      </Para>
      <TokenField value={token} onChange={setToken} />
      <Button title="Xin client secret" onPress={request} disabled={!token} />
      <StatusBadge label={labelForResult(grant?.source ?? null, error)} />
      {grant && (
        <Mono>
          {`model=${grant.model}\nexpiresAt=${grant.expiresAt} (~${secondsLeft}s)\n`}
          {`secret=${grant.clientSecret.slice(0, 6)}… (đã che)`}
        </Mono>
      )}
    </Screen>
  );
}
