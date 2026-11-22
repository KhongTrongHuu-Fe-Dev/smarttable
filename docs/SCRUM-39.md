# SCRUM-39: Ảnh món ăn

## Cấu hình Supabase

- Điền `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vào `.env.local` theo [mẫu cấu hình](../.env.example).
- Trong Storage, tạo bucket **menu-images**, bật **Public bucket** để khách xem ảnh qua public URL.
- Đặt giới hạn file **5 MB** (5242880 bytes), MIME cho phép: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- Chạy [SQL phân quyền Storage](./sql/menu_images_storage.sql) trong Supabase SQL Editor: cấp `INSERT` trên `storage.objects` cho tài khoản đăng nhập có `app_metadata.role = 'admin'`, giới hạn `bucket_id = 'menu-images'`. Public bucket chỉ cho phép đọc công khai, không tự cấp quyền upload.
- Upload dùng [Supabase browser client](../src/lib/supabase/browser.js), cùng phiên cookie với đăng nhập. Không dùng client localStorage riêng và không đưa service-role key vào client.
- Đăng nhập bằng tài khoản admin đã được gán vai trò theo [SQL Auth/RLS](./sql/auth_rls.sql). Nếu vừa thay đổi vai trò, đăng xuất rồi đăng nhập lại để JWT chứa vai trò mới. Không mở quyền upload công khai để tránh lỗi RLS.

## Luồng xử lý

Admin chọn file → kiểm tra loại và dung lượng → xem trước cục bộ → bấm lưu → upload vào `menu-images` với tên UUID → lấy public URL → gửi `image_url` qua `POST /api/menu` hoặc `PATCH /api/menu/[id]`.

API menu hiện có đã lưu và trả về `image_url`, không cần đổi hợp đồng CRUD. Có thể tiếp tục nhập URL thủ công, sửa món không đổi ảnh hoặc để trống ảnh. Khi upload lỗi, không gửi thay đổi tới API menu. Nếu upload thành công nhưng API menu lỗi, biểu mẫu giữ URL để thử lưu lại mà không upload lần nữa.

Ảnh hiển thị ở danh sách Admin, xem trước biểu mẫu, thẻ món và hộp chi tiết menu khách. Ảnh trống hoặc tải lỗi dùng biểu tượng thay thế.

Không xóa ảnh cũ trong Storage khi đổi/xóa món vì URL có thể được dùng chung. File đã upload có thể còn lại nếu người dùng hủy biểu mẫu sau lỗi lưu API.

## Kiểm tra thủ công với Supabase đã cấu hình

1. Thêm món kèm ảnh hợp lệ; kiểm tra object trong bucket, `menu_items.image_url`, tải lại Admin và menu khách.
2. Sửa ảnh món; sửa tên/giá mà không đổi ảnh; kiểm tra ảnh được giữ đúng.
3. Thử file sai loại, rỗng hoặc lớn hơn 5 MB; xác nhận có báo lỗi.
4. Thử lỗi Storage/policy; xác nhận biểu mẫu giữ dữ liệu và không gọi API ghi món. Thử lỗi API sau upload, lưu lại và xác nhận không upload trùng.
5. Kiểm tra món không ảnh, URL ảnh hỏng, tìm kiếm, lọc danh mục, bật/tắt bán, xóa món và thêm vào giỏ hàng.

## Kết quả kiểm tra trong workspace

- `npm.cmd run lint`: thành công, không lỗi/cảnh báo.
- `npm.cmd run build`: thành công, sinh đủ 20 trang.
- Diagnostics của editor: không lỗi ở bốn file JavaScript/JSX thay đổi.
- Kiểm tra trên trình duyệt với API menu và Supabase Storage giả lập: thêm món kèm ảnh; sửa giá giữ nguyên ảnh; thay ảnh; API lỗi rồi lưu lại không upload trùng; chặn MIME sai, file rỗng và file quá 5 MB; Storage lỗi không ghi menu và có thể thử lại.
- Kiểm tra CRUD/UI giả lập: tìm kiếm, lọc danh mục, bật/tắt bán, xóa món; ảnh ở thẻ món và chi tiết khách; URL hỏng có biểu tượng thay thế; thêm món vào giỏ hàng.
- Chưa kiểm tra upload/database trên Supabase thật vì workspace chưa có cấu hình kết nối. Bucket public và policy cần xác nhận trên project đích.

## Vấn đề sẵn có ngoài phạm vi SCRUM-39

Trong [màn hình bếp](../src/app/kitchen/page.jsx), `fetchKitchenData` đọc `ordersData.orders` trong khi [GET orders](../src/app/api/orders/route.js) trả về một mảng trực tiếp, khiến danh sách bếp bị rỗng. `moveOrder` gửi `PATCH /api/orders` trong khi [endpoint cập nhật trạng thái](../src/app/api/orders/[id]/route.js) nằm ở `PATCH /api/orders/[id]`. Ghi nhận để xử lý riêng, không thay đổi các luồng này trong SCRUM-39.
