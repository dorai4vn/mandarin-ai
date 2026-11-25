'use client';
import { useState } from 'react';
import { ErrorState } from '@/components/ui/index';

/** UI-2B: page-level ErrorState sample (focus moves to "Thử lại" on mount). Sample only. */
export default function ErrorPageSample() {
  const [retries, setRetries] = useState(0);
  return (
    <ErrorState
      level="page"
      headingLevel="h1"
      title="Không tải được trang"
      description={`Kiểm tra kết nối rồi thử lại (ví dụ). Đã thử lại: ${retries}.`}
      onRetry={() => setRetries((n) => n + 1)}
      details="Ví dụ: network_unreachable"
      data-testid="error-page"
    />
  );
}
