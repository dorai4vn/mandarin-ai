'use client';
import { useState, type ReactNode } from 'react';
import { PageHeader } from '@/components/ui';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardLink,
  CountBadge,
  IconButton,
  Input,
  PasswordInput,
  SearchInput,
  StatusDot,
  StudyCard,
  Textarea,
} from '@/components/ui/index';
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

  return (
    <>
      <PageHeader
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
                <Button loading>Đang tải</Button>
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
                  <Button type="submit" loading data-testid="btn-loading-submit">
                    Đang gửi
                  </Button>
                  <span className="text-sm text-fg-subtle">Lần gửi: {submits}</span>
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
                <IconButton label="Tìm kiếm" variant="secondary">
                  <SearchIcon width={20} height={20} />
                </IconButton>
                <IconButton label="Đóng">
                  <CloseIcon width={20} height={20} />
                </IconButton>
                <IconButton label="Thêm" variant="primary" shape="circle">
                  <PlusIcon width={20} height={20} />
                </IconButton>
                <IconButton label="Đóng (nhỏ)" size="sm">
                  <CloseIcon width={18} height={18} />
                </IconButton>
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
                label="Mật khẩu"
                autoComplete="current-password"
                data-testid="field-password"
              />
              <Input label="Lớn (lg 52)" size="lg" placeholder="Ví dụ" />
              <Textarea
                label="Ghi chú"
                placeholder="Ví dụ: 山 = núi"
                hint="Tối đa 500 ký tự."
                className="md:col-span-2"
              />
              <SearchInput
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
      </div>
    </>
  );
}
