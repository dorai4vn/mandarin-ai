import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { useState } from 'react';
import { StatusBadge } from '../../src/components/StatusBadge';
import { Button, Mono, Para, Screen } from '../../src/components/ui';
import { buildKeyPragma, bytesToHex, isSqlCipherVersion } from '../../src/lib/sqlcipher';

const KEY_NAME = 'mandarin.db.key.v1';
const DB_NAME = 'm0-spike-encrypted.db';

async function getOrCreateKey(): Promise<string> {
  const opts = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
  const existing = await SecureStore.getItemAsync(KEY_NAME, opts);
  if (existing) return existing;
  const key = bytesToHex(getRandomBytes(32));
  await SecureStore.setItemAsync(KEY_NAME, key, opts);
  return key;
}

/** Runs the D-011 checks and returns a log. Never prints the key. */
async function runChecks(log: (line: string) => void): Promise<boolean> {
  const key = await getOrCreateKey();
  log('Khóa 256-bit: đã lưu trong Keychain (WHEN_UNLOCKED_THIS_DEVICE_ONLY)');

  await SQLite.deleteDatabaseAsync(DB_NAME).catch(() => undefined);
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(buildKeyPragma(key));
  const version = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version;');
  const cipherOk = isSqlCipherVersion(version?.cipher_version);
  log(
    `PRAGMA cipher_version → ${version?.cipher_version ?? '(trống)'} ${cipherOk ? '✅' : '❌ SQLCipher chưa được link'}`,
  );
  await db.execAsync(
    "CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL); INSERT INTO notes (body) VALUES ('山 — ghi chú bí mật');",
  );
  const row = await db.getFirstAsync<{ body: string }>('SELECT body FROM notes LIMIT 1;');
  log(`Ghi/đọc với khóa: ${row?.body === '山 — ghi chú bí mật' ? '✅' : '❌'}`);
  await db.closeAsync();

  // Re-open WITHOUT the key: reading must fail if the file is really encrypted.
  let unreadable = false;
  const raw = await SQLite.openDatabaseAsync(DB_NAME);
  try {
    await raw.getFirstAsync('SELECT count(*) FROM notes;');
  } catch {
    unreadable = true;
  } finally {
    await raw.closeAsync();
  }
  log(
    `Mở không có khóa → ${unreadable ? 'không đọc được ✅ (file đã mã hóa)' : 'ĐỌC ĐƯỢC ❌ (không mã hóa)'}`,
  );
  await SQLite.deleteDatabaseAsync(DB_NAME);
  return cipherOk && unreadable && row?.body === '山 — ghi chú bí mật';
}

export default function SecureDbSpike() {
  const [lines, setLines] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<'pass' | 'fail' | null>(null);

  const run = async () => {
    const out: string[] = [];
    const log = (l: string) => {
      out.push(l);
      setLines([...out]);
    };
    try {
      setOutcome((await runChecks(log)) ? 'pass' : 'fail');
    } catch (e) {
      log(`Lỗi: ${e instanceof Error ? e.message : String(e)}`);
      setOutcome('fail');
    }
  };

  return (
    <Screen>
      <Para>
        Kiểm tra SQLite mã hóa bằng SQLCipher, khóa sinh ngẫu nhiên trên máy và giữ trong iOS
        Keychain.
      </Para>
      <Button title="Chạy kiểm tra" onPress={run} />
      <StatusBadge
        label={
          outcome === null
            ? { status: 'UNTESTED', text: 'Chưa chạy' }
            : outcome === 'pass'
              ? { status: 'LIVE_UNCONFIRMED', text: 'ĐẠT trên máy này — gửi ảnh chụp để VERIFIED' }
              : { status: 'BLOCKED', text: 'KHÔNG ĐẠT — báo lại để chọn phương án thay thế' }
        }
      />
      <Mono>{lines.join('\n')}</Mono>
    </Screen>
  );
}
