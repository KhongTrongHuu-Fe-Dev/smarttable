// Vai trò lưu trong app_metadata.role của tài khoản Supabase
// (chỉ admin Supabase sửa được, người dùng tự sửa không được).
export const ROLES = {
  ADMIN: "admin",
  KITCHEN: "kitchen",
};

// Trang chủ của từng vai trò sau khi đăng nhập
export function homeForRole(role) {
  if (role === ROLES.ADMIN) return "/admin";
  if (role === ROLES.KITCHEN) return "/kitchen";
  return null;
}
