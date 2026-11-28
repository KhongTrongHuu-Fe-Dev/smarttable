# SmartTable - Gọi món tại bàn bằng mã QR

Khách quét mã QR trên bàn để xem thực đơn, hỏi AI gợi ý món và đặt món ngay trên điện thoại, không cần đăng nhập. Bếp nhận đơn theo thời gian thực. Chủ quán quản lý món, bàn, đơn hàng và xem doanh thu.

**Link web:** https://smarttable-sigma.vercel.app/table/1

## Chức năng

| Vai trò | Đường dẫn | Chức năng |
| --- | --- | --- |
| Khách | `/table/[id]` | Xem thực đơn, tìm món, thêm vào giỏ |
| Khách | `/table/[id]/chat` | Hỏi AI gợi ý món theo khẩu vị, số người, ngân sách |
| Khách | `/table/[id]/cart` | Giỏ hàng, ghi chú từng món, đặt món |
| Khách | `/table/[id]/status` | Theo dõi trạng thái đơn |
| Bếp, Admin | `/kitchen` | Nhận đơn mới ngay (có chuông), chuyển trạng thái đơn |
| Admin | `/admin` | Thống kê doanh thu theo ngày, AI tóm tắt |
| Admin | `/admin/menu` | Quản lý món và danh mục, tải ảnh, AI viết mô tả |
| Admin | `/admin/tables`, `/admin/qr` | Quản lý bàn, tạo và in mã QR |
| Admin | `/admin/orders` | Danh sách đơn, đánh dấu đã thanh toán |

`[id]` trong đường dẫn là mã của bàn trong database, không phải số bàn. Giao diện luôn hiển thị số bàn. Nên mở trang bàn bằng mã QR ở `/admin/qr`.

Trạng thái đơn: `pending` → `cooking` → `done` → `served` → `paid`.

## Công nghệ

- Next.js 16 (App Router), React 19, Tailwind CSS 4
- Supabase: PostgreSQL, Auth, Row Level Security, Realtime, Storage
- Google Gemini: chat gợi ý món, tóm tắt doanh thu, viết mô tả món
- Triển khai trên Vercel, tự cập nhật khi gộp code vào `main`

## Chạy trên máy

Cần Node.js 20.9 trở lên.

```bash
git clone https://github.com/KhongTrongHuu-Fe-Dev/smarttable.git
cd smarttable
npm install
```

Copy `.env.example` thành `.env.local` rồi điền khóa thật (xin trưởng nhóm, gửi riêng):

| Biến | Lấy ở đâu |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys |
| `GEMINI_API_KEY` | Google AI Studio |

**Không đưa `.env.local` lên GitHub.**

```bash
npm run dev     # http://localhost:3000
npm run lint    # kiểm tra lỗi code
npm run build   # build thử bản chạy thật
```

## Tài khoản test

| Vai trò | Email | Vào trang |
| --- | --- | --- |
| Admin | `admin@smarttable.test` | `/admin` |
| Bếp | `bep@smarttable.test` | `/kitchen` |

Đăng nhập tại `/login`. Mật khẩu không ghi trong repo, xin trưởng nhóm.

## Thiết lập Supabase

Repo không có script tạo bảng; cấu trúc dữ liệu mô tả ở [docs/LIEN_KET.md](docs/LIEN_KET.md) mục 2.

- Tài khoản, vai trò và RLS: [docs/sql/auth_rls.sql](docs/sql/auth_rls.sql) (đọc phần thứ tự chạy ở đầu file)
- Bucket ảnh `menu-images`: [docs/sql/menu_images_storage.sql](docs/sql/menu_images_storage.sql)
- Realtime: thêm bảng `orders` vào publication `supabase_realtime`
- Không cho trùng số bàn và tên danh mục:

```sql
alter table public.tables add constraint tables_number_key unique (number);
alter table public.categories add constraint categories_name_key unique (name);
```

## Tải ảnh món hàng loạt

Bỏ ảnh vào thư mục `anh-mon/`, đặt tên theo món (ví dụ `bun-bo-hue.jpg`), rồi chạy trong PowerShell:

```powershell
node scripts/upload-menu-images.mjs --dry-run   # xem trước, chưa ghi gì
$env:ADMIN_EMAIL="admin@smarttable.test"; $env:ADMIN_PASSWORD="..."
node scripts/upload-menu-images.mjs
```

## Cấu trúc thư mục

```
src/app/          trang (table, kitchen, admin, login) và API (api/)
src/components/   thành phần giao diện
src/lib/          Supabase, Gemini, hàm dùng chung
src/proxy.js      chặn quyền vào /admin và /kitchen
docs/             tài liệu liên kết, sơ đồ, SQL
scripts/          công cụ chạy trên máy
```

## Giới hạn hiện tại

- Ai biết mã đơn đều xem được đơn đó, và dữ liệu đơn đọc được bằng khóa công khai của Supabase.
- Giới hạn 20 tin nhắn chat mỗi bàn mỗi giờ lưu trong bộ nhớ máy chủ, nên bị đặt lại khi máy chủ khởi động lại.
- Chưa có thanh toán trực tuyến, admin đánh dấu thanh toán tại quầy.

## Nhóm thực hiện

| Thành viên | Phần việc |
| --- | --- |
| Trọng Hữu (trưởng nhóm) | Màn hình bếp, giao diện chat, mã QR, đăng nhập, gộp code, triển khai |
| Huy Mai Chấn | Database, API, AI |
| Nghĩa Chu | Giao diện khách |
| Hoàng Vĩnh Phúc | Giao diện quản trị |
| Nguyễn Quốc Đạt | Tài liệu, kiểm thử, báo cáo |

Quy trình làm việc của nhóm: [docs/LIEN_KET.md](docs/LIEN_KET.md) mục 10.
