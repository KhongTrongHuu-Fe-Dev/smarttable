import { createSupabaseBrowser } from "./browser";
import { homeForRole } from "./roles";

function viMessage(message = "") {
  if (/invalid login credentials/i.test(message)) return "Sai email hoặc mật khẩu.";
  if (/email not confirmed/i.test(message)) return "Tài khoản chưa được xác nhận email.";
  if (/rate limit|too many/i.test(message)) return "Thử quá nhiều lần, vui lòng đợi một lúc.";
  if (/fetch|network/i.test(message)) return "Không kết nối được máy chủ.";
  return "Đăng nhập thất bại, vui lòng thử lại.";
}

// Đăng nhập. Thành công trả { role, home }, thất bại trả { error }.
export async function signIn(email, password) {
  const supabase = createSupabaseBrowser();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: viMessage(error.message) };

  const role = data.user?.app_metadata?.role;
  const home = homeForRole(role);
  if (!home) {
    await supabase.auth.signOut();
    return { error: "Tài khoản này chưa được cấp quyền admin hoặc bếp." };
  }
  return { role, home };
}

export async function signOut() {
  const supabase = createSupabaseBrowser();
  await supabase.auth.signOut();
}
