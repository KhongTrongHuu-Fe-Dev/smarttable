import { createBrowserClient } from "@supabase/ssr";

// Client dùng trong trình duyệt. Phiên đăng nhập lưu trong cookie
// để proxy.js và các API cùng đọc được.
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
