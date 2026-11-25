'use client';
import { useState, type ReactNode } from 'react';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardLink,
  CountBadge,
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  PageHeader,
  PasswordInput,
  ProgressBar,
  ProgressRing,
  SearchInput,
  Skeleton,
  SkeletonGroup,
  StatusDot,
  StudyCard,
  Tabs,
  Textarea,
  Tooltip,
  useShowAfter,
} from '@/components/ui/index';
import { HanziText, Pinyin } from '@/components/Hanzi';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowRightIcon, CloseIcon, PlusIcon, SearchIcon } from '@/components/icons';

/**
 * UI-2 component gallery (UI_MIGRATION_PLAN §4 PR-2). Visual + accessibility test target.
 * Everything here is SAMPLE content, labelled "Ví dụ" — it is not learner data.
 */
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4" data-testid={`gallery-${id}`}>
      <h2 id={id} className="text-[22px] font-semibold leading-[30px] text-fg">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-[0.01em] text-fg-subtle">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export default function DesignGallery() {
  const [query, setQuery] = useState('nǐ hǎo');
  const [saving, setSaving] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [submits, setSubmits] = useState(0);
  const [stuckClicks, setStuckClicks] = useState(0);
  const [progress, setProgress] = useState(7);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const showSkeleton = useShowAfter(loadingDemo);
  const [failed, setFailed] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="Phòng thử · UI-2 / UI-2B"
        title="Thư viện component"
        lead="Phòng thử giao diện: mọi nội dung trên trang này là ví dụ minh họa, không phải dữ liệu học thật."
      />
      <div className="flex flex-col gap-10" data-testid="design-gallery">
        <Section id="buttons" title="Button">
          <Card>
            <div className="flex flex-col gap-5">
              <Row label="Variant (md)">
                <Button data-testid="btn-primary">Bắt đầu học</Button>
                <Button variant="secondary">Xem lại</Button>
                <Button variant="ghost">Bỏ qua</Button>
                <Button variant="danger">Xóa tài liệu</Button>
                <Button variant="success">Tiếp tục</Button>
              </Row>
              <Row label="Size">
                <Button size="sm">Nhỏ 36</Button>
                <Button size="md">Vừa 44</Button>
                <Button size="lg">Lớn 52</Button>
              </Row>
              <Row label="Trạng thái">
                <Button icon={<PlusIcon width={20} height={20} />}>Có icon</Button>
                <Button disabled data-testid="btn-disabled">
                  Vô hiệu
                </Button>
                <Button variant="secondary" disabled>
                  Vô hiệu
                </Button>
                <Button
                  loading={saving}
                  data-testid="btn-loading"
                  data-clicks={clicks}
                  onClick={() => {
                    setClicks((n) => n + 1);
                    setSaving(true);
                    setTimeout(() => setSaving(false), 1500);
                  }}
                >
                  {saving ? 'Đang lưu…' : 'Lưu (bấm thử)'}
                </Button>
                <Button
                  loading
                  data-testid="btn-always-loading"
                  data-clicks={stuckClicks}
                  onClick={() => setStuckClicks((n) => n + 1)}
                >
                  Đang tải
                </Button>
              </Row>
              <Row label="Nút submit đang tải trong form (không gửi lặp)">
                <form
                  data-testid="loading-form"
                  data-submits={submits}
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSubmits((n) => n + 1);
                  }}
                  className="flex flex-wrap items-center gap-3"
                >
                  <Input
                    label="Lời nhắn (Enter để gửi)"
                    defaultValue="Ví dụ"
                    data-testid="loading-form-input"
                    className="w-56"
                  />
                  <Button type="submit" loading data-testid="btn-loading-submit">
                    Đang gửi
                  </Button>
                  <span className="text-sm text-fg-muted">Lần gửi: {submits}</span>
                </form>
              </Row>
              <Row label="Link dạng nút · Icon button">
                <ButtonLink
                  href="/lab"
                  variant="secondary"
                  icon={<ArrowRightIcon width={20} height={20} />}
                >
                  Về Phòng thử
                </ButtonLink>
                <Tooltip content="Tìm kiếm">
                  <IconButton label="Tìm kiếm" variant="secondary" data-testid="icon-search">
                    <SearchIcon width={20} height={20} />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Đóng">
                  <IconButton label="Đóng">
                    <CloseIcon width={20} height={20} />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Thêm từ mới">
                  <IconButton label="Thêm" variant="primary" shape="circle">
                    <PlusIcon width={20} height={20} />
                  </IconButton>
                </Tooltip>
                <IconButton label="Đóng (nhỏ)" size="sm">
                  <CloseIcon width={18} height={18} />
                </IconButton>
              </Row>
              <Row label="Tooltip sát mép phải (tự dịch vào trong màn hình)">
                <div className="flex w-full justify-end">
                  <Tooltip content="Mẹo: nhấn phím / để tìm nhanh trong từ điển (ví dụ nội dung dài).">
                    <IconButton
                      label="Mẹo tìm kiếm"
                      variant="secondary"
                      data-testid="icon-tip-edge"
                    >
                      <SearchIcon width={20} height={20} />
                    </IconButton>
                  </Tooltip>
                </div>
              </Row>
              <Row label="Full-width (mobile, form)">
                <Button size="lg" fullWidth>
                  Đăng nhập
                </Button>
              </Row>
            </div>
          </Card>
        </Section>

        <Section id="study" title="Study Card">
          <p className="text-sm text-fg-muted">
            Pastel: xanh (Từ vựng), lavender (Nghe hiểu), mint (Luyện viết). Số liệu dưới tiêu đề
            chỉ là <strong>ví dụ</strong>; trên màn hình thật chỉ hiện số liệu thật, tính năng chưa
            có dùng nhãn “Sắp có”.
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            <StudyCard
              tone="blue"
              title="Từ vựng mới"
              meta="Ví dụ: 15 từ"
              href="/lab/design"
              data-testid="study-blue"
            />
            <StudyCard
              tone="lavender"
              title="Nghe hiểu"
              meta="Ví dụ: 5 bài"
              href="/lab/design"
              data-testid="study-lavender"
            />
            <StudyCard
              tone="mint"
              title="Luyện viết"
              meta="Hanzi"
              href="/lab/handwriting"
              data-testid="study-mint"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            <StudyCard tone="blue" title="Từ vựng mới" comingSoon data-testid="study-soon" />
            <StudyCard
              tone="lavender"
              title="Nghe hiểu"
              comingSoon
              data-testid="study-lavender-soon"
            />
            <StudyCard tone="mint" title="Luyện viết" comingSoon />
          </div>
        </Section>

        <Section id="cards" title="Card">
          <div className="grid gap-4 md:grid-cols-2">
            <Card
              title="Mặc định"
              action={
                <Button variant="ghost" size="sm">
                  Sửa
                </Button>
              }
              footer={<p className="text-sm text-fg-subtle">Chân card (tùy chọn)</p>}
              data-testid="card-default"
            >
              <p className="text-fg-muted">Nền trắng, viền mảnh, không đổ bóng.</p>
            </Card>
            <Card title="Subtle" variant="subtle">
              <p className="text-fg-muted">Nhóm thông tin phụ, không viền.</p>
            </Card>
            <Card title="Gợi ý AI" variant="highlight" tone="secondary">
              <p className="text-fg-muted">
                Viền trái lavender — dành cho gợi ý (tối đa 1 mỗi màn hình).
              </p>
            </Card>
            <CardLink
              href="/lab/design"
              title="Card tương tác"
              description="Cả card là một link; hover có bóng nhẹ."
              data-testid="card-link"
            />
          </div>
        </Section>

        <Section id="badges" title="Badge · chỉ báo trạng thái">
          <Card>
            <div className="flex flex-col gap-5">
              <Row label="Badge">
                <Badge>HSK 1</Badge>
                <Badge variant="primary">Mới</Badge>
                <Badge variant="secondary">AI</Badge>
                <Badge variant="success">Đã thuộc</Badge>
                <Badge variant="warning">Cần ôn</Badge>
                <Badge variant="error">Lỗi</Badge>
                <Badge variant="accent">Điểm nhấn</Badge>
                <CountBadge count={12} label="Ví dụ: 12 thẻ đến hạn" />
              </Row>
              <Row label="Status indicator">
                <StatusDot tone="success">Đã đồng bộ</StatusDot>
                <StatusDot tone="primary">2 chờ đồng bộ</StatusDot>
                <StatusDot tone="warning">Offline</StatusDot>
                <StatusDot tone="error">1 lỗi đồng bộ</StatusDot>
                <StatusDot tone="neutral">Chưa chạy</StatusDot>
              </Row>
              <Row label="StatusBadge (Phòng thử)">
                <StatusBadge label={{ status: 'VERIFIED', text: 'VERIFIED — đã kiểm tra' }} />
                <StatusBadge
                  label={{ status: 'LIVE_UNCONFIRMED', text: 'LIVE — kết quả thật từ máy chủ' }}
                />
                <StatusBadge label={{ status: 'MOCKED', text: 'MOCK — kết quả giả lập' }} />
                <StatusBadge label={{ status: 'BLOCKED', text: 'Lỗi — ví dụ' }} />
                <StatusBadge label={{ status: 'UNTESTED', text: 'Chưa chạy' }} />
              </Row>
            </div>
          </Card>
        </Section>

        <Section id="forms" title="Form">
          <Card>
            <form
              className="grid max-w-[400px] gap-5 md:max-w-none md:grid-cols-2"
              onSubmit={(e) => e.preventDefault()}
            >
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="ban@vidu.vn"
                hint="Email được quản trị viên cấp."
                data-testid="field-email"
              />
              <Input
                id="ten-tai-lieu"
                label="Tên tài liệu"
                defaultValue="Giáo trình HSK 1"
                hint="Ví dụ dùng id riêng."
                optional
              />
              <Input
                label="Email (lỗi)"
                type="email"
                defaultValue="ban@"
                error="Email chưa đúng định dạng."
                data-testid="field-error"
              />
              <Input label="Vô hiệu" defaultValue="Không sửa được" disabled />
              <PasswordInput
                id="mat-khau"
                label="Mật khẩu"
                autoComplete="current-password"
                hint="Ví dụ id riêng cho mật khẩu."
                data-testid="field-password"
              />
              <Input
                label="Chỉ đọc"
                readOnly
                placeholder="Chưa có dữ liệu"
                hint="Ô chỉ đọc: placeholder dùng fg-muted (M8)."
                data-testid="field-readonly"
              />
              <Input label="Lớn (lg 52)" size="lg" placeholder="Ví dụ" />
              <Textarea
                id="ghi-chu"
                label="Ghi chú"
                placeholder="Ví dụ: 山 = núi"
                hint="Tối đa 500 ký tự."
                className="md:col-span-2"
              />
              <SearchInput
                id="tim-kiem"
                label="Tìm trong từ điển"
                value={query}
                onValueChange={setQuery}
                placeholder="Tìm chữ Hán, pinyin hoặc nghĩa"
                className="md:col-span-2"
                data-testid="field-search"
              />
            </form>
          </Card>
        </Section>

        <Section id="tabs" title="Tabs">
          <Card>
            <div className="flex flex-col gap-8">
              <Tabs
                label="Chế độ xem từ (ví dụ)"
                data-testid="tabs-segmented"
                items={[
                  {
                    id: 'nghia',
                    label: 'Nghĩa',
                    content: (
                      <p className="text-fg-muted">
                        <HanziText className="text-fg">山</HanziText> · <Pinyin>shān</Pinyin> — núi
                        (ví dụ).
                      </p>
                    ),
                  },
                  {
                    id: 'vi-du',
                    label: 'Ví dụ',
                    content: <p className="text-fg-muted">Câu ví dụ.</p>,
                  },
                  {
                    id: 'chiet-tu',
                    label: 'Chiết tự',
                    content: <p className="text-fg-muted">Bộ thủ.</p>,
                  },
                ]}
              />
              <Tabs
                label="Thư viện (ví dụ)"
                variant="underline"
                data-testid="tabs-underline"
                items={[
                  {
                    id: 'giao-trinh',
                    label: 'Giáo trình',
                    content: <p className="text-fg-muted">Danh sách giáo trình.</p>,
                  },
                  {
                    id: 'tai-lieu',
                    label: 'Tài liệu của tôi',
                    content: <p className="text-fg-muted">PDF đã tải lên.</p>,
                  },
                  {
                    id: 'luu',
                    label: 'Đã lưu',
                    content: <p className="text-fg-muted">Mục đã lưu.</p>,
                  },
                  {
                    id: 'gan-day',
                    label: 'Gần đây',
                    content: <p className="text-fg-muted">Mở gần đây.</p>,
                  },
                  {
                    id: 'chia-se',
                    label: 'Được chia sẻ',
                    content: <p className="text-fg-muted">Từ bạn học.</p>,
                  },
                ]}
              />
            </div>
          </Card>
        </Section>

        <Section id="progress" title="Progress">
          <Card>
            <div className="flex flex-col gap-6">
              <ProgressBar
                label="Tiến độ phiên (ví dụ)"
                showLabel
                value={progress}
                max={20}
                valueText={`${progress} / 20`}
                data-testid="progress-bar"
              />
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" size="sm" onClick={() => setProgress((p) => p - 5)}>
                  −5
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setProgress((p) => p + 5)}>
                  +5
                </Button>
              </div>
              <ProgressBar
                label="Mục tiêu ngày (ví dụ)"
                showLabel
                value={20}
                max={20}
                tone="success"
                valueText="20 / 20"
              />
              <ProgressBar label="Đầu phiên học" thin value={3} max={10} />
              <ProgressBar
                label="Đang tải tệp (ví dụ)"
                showLabel
                data-testid="progress-indeterminate"
              />
              <div className="flex flex-wrap items-center gap-6">
                <ProgressRing
                  label="Mục tiêu ngày (ví dụ)"
                  value={60}
                  data-testid="progress-ring"
                />
                <ProgressRing label="Hoàn thành (ví dụ)" value={100} tone="success" size={80} />
              </div>
            </div>
          </Card>
        </Section>

        <Section id="skeleton" title="Skeleton">
          <Card>
            <div className="flex flex-col gap-4">
              <Button
                variant="secondary"
                onClick={() => setLoadingDemo((v) => !v)}
                className="self-start"
                data-testid="skeleton-toggle"
              >
                {loadingDemo ? 'Dừng tải (ví dụ)' : 'Mô phỏng tải dữ liệu'}
              </Button>
              {showSkeleton ? (
                <SkeletonGroup data-testid="skeleton-group" className="flex flex-col gap-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full max-w-md" />
                  <Skeleton className="h-24 w-full" radius="card" />
                </SkeletonGroup>
              ) : (
                <p className="text-sm text-fg-muted" data-testid="skeleton-idle">
                  {loadingDemo
                    ? 'Đang chờ (skeleton chỉ hiện sau 300 ms).'
                    : 'Không tải — bấm nút để xem skeleton.'}
                </p>
              )}
            </div>
          </Card>
        </Section>

        <Section id="states" title="Empty / Error state">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <EmptyState
                hanzi="学"
                title="Chưa có từ nào"
                description="Thêm từ đầu tiên để bắt đầu ôn tập (ví dụ)."
                primaryAction={<ButtonLink href="/lab/design">Thêm từ</ButtonLink>}
                data-testid="empty-first-use"
              />
            </Card>
            <Card>
              <EmptyState
                variant="coming-soon"
                hanzi="听"
                title="Nghe hiểu"
                description="Bài nghe theo cấp độ HSK."
                milestone="M6"
                data-testid="empty-coming-soon"
              />
            </Card>
            <Card>
              <EmptyState
                variant="no-results"
                title="Không tìm thấy “xyz”"
                description="Thử pinyin không dấu, ví dụ “ni hao”."
              />
            </Card>
            <Card>
              {failed ? (
                <ErrorState
                  title="Không tải được danh sách"
                  description="Máy chủ chưa phản hồi. Dữ liệu đã lưu trên máy vẫn dùng được (ví dụ)."
                  onRetry={() => setFailed(false)}
                  details="Ví dụ: provider_http_error 502"
                  data-testid="error-section"
                />
              ) : (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm text-fg-muted">
                    ErrorState mức section xuất hiện sau thao tác.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => setFailed(true)}
                    data-testid="error-trigger"
                  >
                    Mô phỏng lỗi
                  </Button>
                </div>
              )}
            </Card>
            <Card className="md:col-span-2">
              <ErrorState
                level="inline"
                announce={false}
                title="Tệp không phải PDF."
                description="Hãy chọn tệp .pdf (ví dụ)."
              />
            </Card>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-fg-muted">ErrorState mức trang (focus vào “Thử lại”):</p>
            <ButtonLink href="/lab/design/error" variant="secondary">
              Xem trang lỗi mẫu
            </ButtonLink>
          </div>
        </Section>
      </div>
    </>
  );
}
