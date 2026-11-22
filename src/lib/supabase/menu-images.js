import { createSupabaseBrowser } from "./browser";
import { ROLES } from "./roles";

export const MENU_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const imageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
export const MENU_IMAGE_ACCEPT = Object.keys(imageExtensions).join(",");

export function validateMenuImage(file) {
  if (!file || !Object.hasOwn(imageExtensions, file.type)) {
    throw new Error("Vui lòng chọn ảnh JPEG, PNG, WebP hoặc GIF.");
  }
  if (file.size === 0 || file.size > MENU_IMAGE_MAX_SIZE) {
    throw new Error("Ảnh phải có dung lượng lớn hơn 0 và không vượt quá 5 MB.");
  }
}

export async function uploadMenuImage(file) {
  validateMenuImage(file);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Chưa kết nối Supabase. Không thể tải ảnh lên.");
  }

  // Dùng cùng client cookie với đăng nhập để Storage nhận JWT của admin.
  const supabase = createSupabaseBrowser();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tải ảnh lên.");
  }
  if (authData.user.app_metadata?.role !== ROLES.ADMIN) {
    throw new Error("Chỉ tài khoản quản trị viên mới được tải ảnh món ăn lên.");
  }

  const bucket = supabase.storage.from("menu-images");
  const path = `${crypto.randomUUID()}.${imageExtensions[file.type]}`;
  const { data, error } = await bucket.upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    if (/row.level security|row-level security/i.test(error.message)) {
      throw new Error("Không thể tải ảnh lên: tài khoản chưa được cấp quyền upload vào bucket menu-images. Vui lòng kiểm tra policy Storage dành cho admin; nếu vừa đổi vai trò, hãy đăng nhập lại.");
    }
    throw new Error(`Không thể tải ảnh lên: ${error.message}`);
  }

  const { data: publicData } = bucket.getPublicUrl(data.path);
  return publicData.publicUrl;
}
