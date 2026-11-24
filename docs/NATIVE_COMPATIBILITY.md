> **LỊCH SỬ** — Tài liệu này mô tả M0 native (Expo) đã bị thay thế bởi hướng Web/PWA (D-018). Giữ lại để tham khảo; ma trận Safari sẽ nằm ở `docs/WEB_COMPATIBILITY.md` (M0-PWA).

# Ma trận tương thích native (M0)

Ngày kiểm tra: 2026-11-23. Môi trường kiểm tra: container Linux x86_64 (không có macOS/Xcode/iPhone), mạng chỉ cho phép npm/CocoaPods CDN/Docker registry.

Nhãn: **VERIFIED** = có bằng chứng chạy thật · **VERIFIED (cấu hình)** = đã kiểm chứng cấu hình/sinh project nhưng chưa biên dịch native · **MOCKED** = chỉ chạy bằng adapter giả · **BLOCKED** = thiếu tài nguyên bên ngoài.

## Baseline
| Thành phần | Phiên bản chốt | Nguồn kiểm chứng | Trạng thái |
|---|---|---|---|
| Expo SDK | `expo ~58.0.26` (npm `latest`) | `npm view expo dist-tags` | VERIFIED (cấu hình) |
| React Native / React | `0.88.1` / `19.3.0` | template `blank-typescript@sdk-58` | VERIFIED (cấu hình) |
| TypeScript | `~6.0.3` | template SDK 58; `typescript-eslint` hỗ trợ `<6.1` | VERIFIED (typecheck chạy) |
| iOS deployment target | **16.4** | podspec `ExpoModulesCore` 58 và `ExpoSQLite` 58 khai báo `:ios => '16.4'`; `expo prebuild` sinh `IPHONEOS_DEPLOYMENT_TARGET = 16.4` | VERIFIED (cấu hình) |
| Phiên bản native module khớp SDK | 21 package | `pnpm check:expo` so với `expo/bundledNativeModules.json` | VERIFIED |
| Bundle JS iOS (Hermes) | 1435 module, 3.6 MB `.hbc` | `expo export --platform ios` | VERIFIED |
| Sinh project iOS | Podfile, Info.plist, Podfile.properties | `expo prebuild --platform ios --no-install` | VERIFIED (cấu hình) |
| `pod install` + biên dịch Xcode | — | Cần macOS/EAS | **BLOCKED** (không có macOS; chạy qua EAS Build) |

## Tích hợp native
| Hạng mục | Thư viện / phiên bản | Đã kiểm chứng | Chưa kiểm chứng / rủi ro | Trạng thái |
|---|---|---|---|---|
| ML Kit Digital Ink (iOS) | Local Expo module `modules/digital-ink` (Swift) + pod `GoogleMLKit/DigitalInkRecognition 9.0.0` (MLKitDigitalInkRecognition 8.0.0 là bản mới nhất trên CocoaPods trunk) | Module được Expo autolinking nhận (`DigitalInk` / `DigitalInkModule`); interface TS; logic ghi nét (test); grader chỉ tính ứng viên đầu (test) | Swift chưa biên dịch; yêu cầu iOS tối thiểu của pod ML Kit 9 chưa đọc được (CDN podspec bị chặn) nhưng ML Kit lịch sử ≤ 16.4; ML Kit **không hỗ trợ arm64 iOS Simulator** (chỉ test trên máy thật); tải model `zh-Hani-CN` cần mạng lần đầu; điều khoản ML Kit cần chủ dự án xác nhận | **BLOCKED** (cần EAS build + iPhone); app tự rơi về **MOCK** có nhãn khi module chưa link |
| Ghi âm | `expo-audio ~58.0.12`, WAV LinearPCM 16 kHz/16-bit/mono | Plugin sinh `NSMicrophoneUsageDescription` tiếng Việt; code typecheck | Định dạng file thực tế trên iPhone; luồng từ chối quyền | **BLOCKED** (cần iPhone) |
| Azure pronunciation assessment | REST short-audio qua `apps/api` (`AzurePronunciationAssessment`) | Header `Pronunciation-Assessment`, endpoint theo region, ánh xạ điểm giữ `null` khi thiếu, giới hạn kích thước (unit test với fetch giả) | Gọi Azure thật (không có key; host Azure bị chặn trong môi trường này); độ chính xác thanh điệu với giọng người Việt | **MOCKED** (đường đi) / **BLOCKED** (live) |
| OpenAI Realtime auth | `POST /v1/realtime/client_secrets` qua `apps/api`, TTL 10–7200 s | Endpoint/payload/ánh xạ (unit test), API chỉ cấp cho JWT hợp lệ, có rate limit, key không có trong bundle mobile | Gọi OpenAI thật (không có key; `api.openai.com` bị chặn); tên model `gpt-realtime` cần xác nhận với tài khoản | **MOCKED** / **BLOCKED** (live) |
| SQLite mã hóa | `expo-sqlite ~58.0.18` plugin `useSQLCipher: true` (SQLCipher 4.17.0 / SQLite 3.53.3 vendored) | Podfile.properties có `expo.sqlite.useSQLCipher = true`; helper `PRAGMA key` chặn injection (test) | Chạy thật trên dev build: `cipher_version`, mở file không khóa phải lỗi | **BLOCKED** (cần iPhone); nếu thất bại → đề xuất phương án thay thế (D-011) |
| Secure storage | `expo-secure-store ~58.0.3`, `WHEN_UNLOCKED_THIS_DEVICE_ONLY` | Plugin đăng ký; code typecheck | Keychain trên máy thật | **BLOCKED** (cần iPhone) |
| Supabase Postgres + RLS | Supabase CLI 3.3.0, Postgres 17 (`supabase/postgres:17.12.0.002`) | `db start`, `db reset`, `test db` (9/9 pgTAP PASS; cố tình làm rò policy → FAIL 2/9), `db lint` không lỗi | Supabase Auth/JWKS thật với `apps/api` | **VERIFIED** (DB local) |
| Xác thực JWT ở API | `jose 6.2.18`, JWKS hoặc HS256 | Token giả mạo / sai audience / `sub` không phải UUID bị từ chối (test) | JWKS của dự án Supabase thật | **VERIFIED** (HS256 local) / chưa thử JWKS thật |
| Expo Router + dev client | `expo-router ~58.0.32`, `expo-dev-client ~58.0.21` | Bundle + prebuild | Chạy trên máy | **BLOCKED** (cần iPhone) |
| Android | — | Chỉ giữ code dùng chung; module Digital Ink khai báo `platforms: ["apple"]` | Bridge Android, quyền, Play | Hoãn tới cổng Android (post-iOS) |

## Việc cần làm để chuyển BLOCKED → VERIFIED
1. Chủ dự án cấu hình EAS + Apple Developer, chạy `eas build --profile development` (xem `docs/SETUP.md` §5).
2. Cài lên iPhone, chạy 6 bước kiểm thử ở `docs/SETUP.md` §6, gửi ảnh/quay màn hình + model iPhone + phiên bản iOS + build ID.
3. Cung cấp key OpenAI/Azure cho môi trường `apps/api` (không qua chat, không commit) để chạy spike live.
