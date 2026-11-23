# Hướng dẫn cài đặt & chạy (M0)

## 1. Yêu cầu
| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | 22.x (xem `.nvmrc`) | `engine-strict` bật — sai phiên bản sẽ báo lỗi khi cài |
| pnpm | 10.28.x | `corepack enable` rồi dùng `packageManager` trong `package.json` |
| Docker | bản mới | Chỉ cần cho Supabase local (`pnpm db:*`) |
| macOS + Xcode | chỉ khi build iOS cục bộ | Không bắt buộc: có thể dùng EAS Build trên cloud |
| Tài khoản Expo (EAS) | — | Để build development client cho iPhone |
| Apple Developer Program | — | Để ký bản build cài lên iPhone thật |

## 2. Cài đặt
```bash
corepack enable
```
```bash
pnpm install --frozen-lockfile
```
```bash
pnpm build && pnpm lint && pnpm typecheck && pnpm test
```

Cấu trúc: `packages/contracts` ← `packages/domain` ← `packages/adapters` ← `apps/api`, `apps/mobile` (D-010). Kiểm tra ranh giới module: `pnpm check:deps`.

## 3. Supabase local (cần Docker)
```bash
pnpm db:start
```
```bash
pnpm db:reset && pnpm db:test
```
`pnpm exec supabase status` in ra URL, publishable key và JWT secret local. **Chỉ dùng cho máy local**; không commit.

## 4. API (`apps/api`)
```bash
cp apps/api/.env.example apps/api/.env
```
Điền `SUPABASE_URL` (hoặc `SUPABASE_JWT_SECRET` cho local), tùy chọn `OPENAI_API_KEY`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`. Thiếu key → API trả kết quả gắn nhãn **MOCK** (chỉ môi trường development) hoặc HTTP 503 (`MISSING_PROVIDER_MODE=disabled`, và luôn như vậy ở production).
```bash
pnpm --filter @mandarin/api dev
```
Kiểm tra: `curl http://localhost:8787/health` — trường `providers` cho biết từng nhà cung cấp đang `live` hay `mock`.

Hosting: image Docker chung `apps/api/Dockerfile` (Railway là ứng viên, D-009). **Không deploy production trong M0.**

## 5. App iOS (`apps/mobile`) — development build
Expo Go **không** chạy được ML Kit Digital Ink và SQLCipher; bắt buộc dùng development build.

1. Đăng nhập EAS và liên kết dự án (một lần):
   ```bash
   cd apps/mobile && npx eas-cli@27.11.0 login
   ```
   ```bash
   npx eas-cli@27.11.0 init
   ```
   Ghi `projectId` vào biến `EAS_PROJECT_ID` (file `apps/mobile/.env` và GitHub repository variable).
2. Chọn bundle identifier thật (ví dụ `vn.<tên-bạn>.mandarinai.dev`) → `IOS_BUNDLE_IDENTIFIER`.
3. Đăng ký iPhone cho internal distribution:
   ```bash
   npx eas-cli@27.11.0 device:create
   ```
4. Build:
   ```bash
   npx eas-cli@27.11.0 build --platform ios --profile development
   ```
   Hoặc chạy workflow GitHub **EAS iOS development build** (cần secret `EXPO_TOKEN`).
5. Cài bản build lên iPhone (link/QR từ EAS), bật **Developer Mode** (Cài đặt → Quyền riêng tư & Bảo mật).
6. Chạy Metro trên máy tính cùng mạng Wi-Fi:
   ```bash
   cd apps/mobile && EXPO_PUBLIC_API_URL=http://<IP-LAN>:8787 pnpm start
   ```

## 6. Kịch bản kiểm thử thủ công trên iPhone (M0)
Ghi lại: model iPhone, phiên bản iOS, build ID EAS, ảnh chụp/quay màn hình cho từng bước.

1. **Khởi động**: app mở được, màn hình chính hiện "máy thật", "Digital Ink native: đã link", "QuizType: 6 loại".
2. **Viết tay 山**: vào spike 1, viết 山 bằng ngón tay (3 nét), bấm *Gửi & nhận dạng*. Lần đầu sẽ tải model `zh-Hani-CN` (cần mạng). Kỳ vọng: nhãn **LIVE**, ứng viên đầu tiên là 山, kết quả "Đúng". Viết sai một chữ khác → không được tính đúng.
3. **Ghi âm**: spike 2 → *Bắt đầu ghi* → hệ thống hỏi quyền micro (thông báo tiếng Việt) → đọc 你好 → *Dừng* → *Nghe lại*. Thử từ chối quyền micro → app hiện nút mở Cài đặt, không crash.
4. **Azure** (khi API có `AZURE_SPEECH_KEY`): dán access token Supabase của tài khoản test vào ô token → *Gửi chấm phát âm*. Kỳ vọng nhãn **LIVE** và điểm từ Azure; thiếu chiều điểm nào thì hiện "không có".
5. **OpenAI Realtime** (khi API có `OPENAI_API_KEY`): spike 3 → *Xin client secret*. Kỳ vọng nhãn **LIVE**, `expiresAt` trong tương lai, secret bị che.
6. **SQLCipher**: spike 4 → *Chạy kiểm tra*. Kỳ vọng: `cipher_version` có giá trị, ghi/đọc ✅, "Mở không có khóa → không đọc được ✅".

Lấy access token test (tạm thời đến khi có màn hình đăng nhập ở M1): tạo user trong Supabase Studio/Dashboard rồi đăng nhập bằng REST `POST /auth/v1/token?grant_type=password` với publishable key; **không** dùng service role key.

## 7. Bí mật
- Chỉ commit `*.env.example`. `pnpm check:secrets` chạy trong CI.
- `EXPO_PUBLIC_*` bị nhúng vào app → chỉ chứa giá trị công khai.
- OpenAI/Azure key và Supabase service role chỉ đặt ở môi trường của `apps/api` (và GitHub/Railway secrets khi có).
