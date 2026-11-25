# Claude Code GitHub Actions (@claude)

Workflow: `.github/workflows/claude.yml` (`anthropics/claude-code-action@v1`).

## Xác thực: dùng subscription Claude, không dùng API trả phí

- Workflow chỉ đọc secret **`CLAUDE_CODE_OAUTH_TOKEN`**. Token này gắn với gói Pro/Max.
- Không có `ANTHROPIC_API_KEY` nào trong repo hay workflow.
- Mức dùng tính vào hạn mức subscription của chủ tài khoản.

## Việc chủ dự án làm một lần (không ai khác làm thay được)

1. **Cài Claude GitHub App** cho repo `dorai4vn/mandarin-ai`: https://github.com/apps/claude, chọn **Only select repositories → mandarin-ai**.
2. **Tạo OAuth token trên máy của mình:** chạy `claude setup-token` trong Claude Code CLI, đăng nhập bằng tài khoản Pro/Max, rồi copy token.
3. **Lưu token thành secret:** GitHub → repo → *Settings → Secrets and variables → Actions → New repository secret*.
   - Name: `CLAUDE_CODE_OAUTH_TOKEN`
   - Value: token vừa copy.
   - Không dán token vào issue, PR hay chat.
4. **Merge PR** chứa workflow vào `main`. Workflow kích hoạt bởi comment trên issue/PR luôn chạy từ nhánh mặc định.

## Cách dùng

- Comment `@claude <yêu cầu>` trên một Issue hoặc PR, hoặc đặt `@claude` trong tiêu đề/nội dung khi mở issue mới.
- **Chỉ OWNER / MEMBER / COLLABORATOR** kích hoạt được (`author_association`). Repo public, nên người lạ không thể dùng quota hay chèn lệnh qua comment.
- Claude trả lời bằng một comment, rồi làm việc trên nhánh riêng và mở PR. Quy tắc dự án (tiếng Việt, không merge, không deploy Production, không đổi cấu hình Railway / Vercel / Supabase, không lộ secret, không nới test, giữ quyết định thiết kế) nằm trong `--append-system-prompt`.
- Lệnh Bash được phép giới hạn ở `pnpm install / lint / typecheck / test / build / format / check:*`, `pnpm --filter …` và các lệnh git chỉ đọc.

## Kiểm tra

Sau bước 1–4, comment `@claude` trên issue kiểm tra. Tab Actions → "Claude Code" phải có một run thành công, và Claude phải trả lời trong issue.

**Nếu run lỗi:**
- `Could not fetch an OIDC token` hoặc lỗi về GitHub App: App chưa được cài cho repo.
- Lỗi xác thực: secret `CLAUDE_CODE_OAUTH_TOKEN` thiếu hoặc hết hạn; chạy lại `claude setup-token`.
- Không có run nào: comment không chứa `@claude`, người comment không phải owner/collaborator, hoặc workflow chưa có trên `main`.
