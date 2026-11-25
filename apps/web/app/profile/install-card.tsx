'use client';
import { usePwa } from '@/components/PwaProvider';
import { Button, Card } from '@/components/ui/index';

/** Optional install (progressive enhancement). Each browser has its own menu; nothing is required. */
export function InstallCard() {
  const { canPrompt, install, swStatus } = usePwa();
  return (
    <Card title="Cài đặt (tùy chọn)" headingLevel="h2">
      <p className="text-sm text-fg-muted">
        Bạn có thể dùng Mandarin AI ngay trên trình duyệt. Nếu muốn mở nhanh như ứng dụng:
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm text-fg-muted">
        <li>
          Chrome / Edge (máy tính, Android): nút cài đặt trên thanh địa chỉ hoặc nút bên dưới.
        </li>
        <li>Safari iPhone/iPad: nút Chia sẻ → “Thêm vào Màn hình chính”.</li>
        <li>Safari Mac: Tệp → “Thêm vào Dock”.</li>
        <li>Firefox: dùng bình thường trên trình duyệt (không cần cài).</li>
      </ul>
      {canPrompt && (
        <Button className="mt-3" onClick={() => void install()}>
          Cài đặt ứng dụng
        </Button>
      )}
      <p className="mt-3 text-xs text-fg-muted" data-testid="sw-status">
        Service worker: {swStatus}
      </p>
    </Card>
  );
}
