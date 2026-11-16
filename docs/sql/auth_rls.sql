-- SmartTable - SCRUM-19: phân quyền bằng Supabase Auth + RLS
-- Chạy trong Supabase: SQL Editor > New query > dán toàn bộ > Run.
-- Có thể chạy lại nhiều lần (đã dùng DROP POLICY IF EXISTS).
--
-- THỨ TỰ BẮT BUỘC:
--   1. Tạo 2 tài khoản (Authentication > Users > Add user, tick "Auto Confirm User").
--   2. Chạy PHẦN A (gán vai trò).
--   3. Triển khai code đăng nhập (nhánh SCRUM-19) lên main.
--   4. Chạy PHẦN B (bật RLS). Bật trước khi có đăng nhập thì admin/bếp sẽ không ghi được.

-- ===== PHẦN A: gán vai trò (đọc từ app_metadata, người dùng không tự sửa được) =====
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
 where email = 'admin@smarttable.test';

update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"kitchen"}'::jsonb
 where email = 'bep@smarttable.test';

-- Kiểm tra: phải ra 2 dòng, đúng vai trò
select email, raw_app_meta_data ->> 'role' as role
  from auth.users
 where email in ('admin@smarttable.test', 'bep@smarttable.test');

-- ===== PHẦN B: bật RLS =====
-- Hàm đọc vai trò từ token đăng nhập (null nếu là khách)
create or replace function public.current_role_name()
returns text
language sql
stable
as $$
  select auth.jwt() -> 'app_metadata' ->> 'role'
$$;

alter table public.categories  enable row level security;
alter table public.menu_items  enable row level security;
alter table public.tables      enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Danh mục, món, bàn: ai cũng ĐỌC; chỉ admin THÊM/SỬA/XÓA
do $$
declare t text;
begin
  foreach t in array array['categories', 'menu_items', 'tables'] loop
    execute format('drop policy if exists "%1$s_read" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_admin_write" on public.%1$s', t);
    execute format('create policy "%1$s_read" on public.%1$s for select using (true)', t);
    execute format(
      'create policy "%1$s_admin_write" on public.%1$s for all
         using (public.current_role_name() = ''admin'')
         with check (public.current_role_name() = ''admin'')', t);
  end loop;
end $$;

-- Đơn hàng:
--  * Ai cũng ĐỌC (trang trạng thái đơn của khách cần đọc theo bàn)
--  * Khách TẠO đơn mới, bắt buộc status = 'pending'
--  * Bếp và admin ĐỔI trạng thái; chỉ admin được chuyển sang 'paid'
--  * Chỉ admin XÓA
drop policy if exists "orders_read"          on public.orders;
drop policy if exists "orders_guest_insert"  on public.orders;
drop policy if exists "orders_staff_update"  on public.orders;
drop policy if exists "orders_admin_delete"  on public.orders;

create policy "orders_read" on public.orders
  for select using (true);

create policy "orders_guest_insert" on public.orders
  for insert with check (status = 'pending');

create policy "orders_staff_update" on public.orders
  for update
  using (public.current_role_name() in ('admin', 'kitchen'))
  with check (
    public.current_role_name() = 'admin'
    or (public.current_role_name() = 'kitchen' and status <> 'paid')
  );

create policy "orders_admin_delete" on public.orders
  for delete using (public.current_role_name() = 'admin');

-- Món trong đơn: ai cũng đọc và thêm (khi đặt đơn); chỉ admin sửa/xóa
drop policy if exists "order_items_read"         on public.order_items;
drop policy if exists "order_items_guest_insert" on public.order_items;
drop policy if exists "order_items_admin_write"  on public.order_items;
drop policy if exists "order_items_admin_delete" on public.order_items;

create policy "order_items_read" on public.order_items
  for select using (true);

create policy "order_items_guest_insert" on public.order_items
  for insert with check (true);

create policy "order_items_admin_write" on public.order_items
  for update using (public.current_role_name() = 'admin')
  with check (public.current_role_name() = 'admin');

create policy "order_items_admin_delete" on public.order_items
  for delete using (public.current_role_name() = 'admin');

-- ===== GỠ (nếu cần quay lại như cũ) =====
-- alter table public.categories  disable row level security;
-- alter table public.menu_items  disable row level security;
-- alter table public.tables      disable row level security;
-- alter table public.orders      disable row level security;
-- alter table public.order_items disable row level security;
