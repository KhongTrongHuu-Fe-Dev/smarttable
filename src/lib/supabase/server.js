import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ROLES } from "./roles";

// Client chạy trên máy chủ, mang theo phiên đăng nhập của người đang gọi API.
// Nhờ vậy các luật RLS trong Supabase biết ai đang ghi dữ liệu.
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Bỏ qua khi gọi từ nơi không được ghi cookie.
          }
        },
      },
    }
  );
}

/**
 * Dùng đầu các API cần đăng nhập.
 *   const auth = await requireRole([ROLES.ADMIN]);
 *   if (auth.error) return auth.error;
 *   const { supabase } = auth;   // client mang quyền của người dùng
 * Trả 401 nếu chưa đăng nhập, 403 nếu sai vai trò.
 */
export async function requireRole(allowedRoles) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    return { error: Response.json({ error: "Bạn cần đăng nhập." }, { status: 401 }) };
  }
  const role = user.app_metadata?.role;
  if (!allowedRoles.includes(role)) {
    return { error: Response.json({ error: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 }) };
  }
  return { supabase, user, role };
}

export { ROLES };
