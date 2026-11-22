-- SmartTable: quyền upload ảnh món ăn.
-- Chạy trong Supabase SQL Editor của cùng project cấu hình trong .env.local.
-- Trước khi chạy: tạo bucket menu-images, bật Public bucket, giới hạn 5 MB
-- và MIME image/jpeg, image/png, image/webp, image/gif.
-- Public chỉ cho phép xem ảnh; policy bên dưới cấp quyền upload cho admin.
-- Không thay đổi policy hoặc dữ liệu của bucket khác.

begin;

drop policy if exists "menu_images_admin_insert" on storage.objects;

create policy "menu_images_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'menu-images'
  and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

commit;

-- Chỉ cần INSERT: ứng dụng tạo tên UUID mới và dùng upsert: false.
-- Không cấp UPDATE/DELETE hoặc quyền upload cho khách.
-- Nếu vừa gán app_metadata.role = admin, đăng xuất/đăng nhập lại để làm mới JWT.

-- Kiểm tra bucket và policy sau khi chạy:
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'menu-images';

select policyname, roles, cmd, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname = 'menu_images_admin_insert';
