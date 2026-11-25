import {
  Button,
  ButtonLink,
  EmptyState,
  PageHeader,
  ProgressBar,
  controlClasses,
} from '@/components/ui/index';

/**
 * UI-2B (M2): this route is a SERVER Component. It must build and render the V2 primitives —
 * including a client <Button loading> boundary and server-safe class builders — without
 * "functions cannot be passed to Client Components" errors. Sample content only.
 */
export default function ServerComponentCheck() {
  return (
    <>
      <PageHeader
        title="Kiểm tra Server Component"
        lead="Trang này render phía máy chủ; nội dung là ví dụ."
      />
      <div className="flex flex-col gap-6" data-testid="server-check">
        <div className="flex flex-wrap items-center gap-3">
          <Button loading data-testid="server-loading">
            Đang lưu
          </Button>
          <ButtonLink href="/lab/design" variant="secondary" data-testid="server-link">
            Về thư viện component
          </ButtonLink>
        </div>
        <label className="flex max-w-sm flex-col gap-1.5 text-sm font-semibold text-fg">
          Ô nhập dùng controlClasses (server)
          <input className={`${controlClasses} h-11 font-normal`} defaultValue="Ví dụ" />
        </label>
        <ProgressBar label="Tiến độ (ví dụ)" showLabel value={3} max={4} valueText="3 / 4" />
        <EmptyState
          variant="coming-soon"
          title="Gia sư AI"
          description="Hội thoại luyện nói với AI."
          milestone="M7"
        />
      </div>
    </>
  );
}
