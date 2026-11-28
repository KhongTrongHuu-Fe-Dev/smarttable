import { requireRole, ROLES } from "@/lib/supabase/server";

export async function PATCH(request, { params }) {
  try {
    // Chỉ admin được ghi dữ liệu. `supabase` bên dưới mang quyền người đăng nhập (RLS).
    const auth = await requireRole([ROLES.ADMIN]);
    if (auth.error) return auth.error;
    const { supabase } = auth;
    if (!supabase) {
      return Response.json({ error: "Chưa kết nối Supabase" }, { status: 500 });
    }
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 80) {
      return Response.json(
        { error: "Tên danh mục phải có từ 1 đến 80 ký tự." },
        { status: 400 }
      );
    }
    const { data, error } = await supabase
      .from("categories")
      .update({ name })
      .eq("id", id)
      .select()
      .single();

    if (error) return Response.json(
      { error: error.code === "23505" ? "Tên danh mục đã tồn tại. Vui lòng nhập tên khác." : error.message },
      { status: error.code === "23505" ? 409 : 400 }
    );
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    // Chỉ admin được ghi dữ liệu. `supabase` bên dưới mang quyền người đăng nhập (RLS).
    const auth = await requireRole([ROLES.ADMIN]);
    if (auth.error) return auth.error;
    const { supabase } = auth;
    if (!supabase) {
      return Response.json({ error: "Chưa kết nối Supabase" }, { status: 500 });
    }
    const { id } = await params;
    const { count, error: usageError } = await supabase
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);
    if (usageError) return Response.json({ error: usageError.message }, { status: 400 });
    if (count > 0) {
      return Response.json(
        { error: "Không thể xóa danh mục đang có món. Hãy chuyển các món sang danh mục khác trước." },
        { status: 409 }
      );
    }
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) return Response.json(
      { error: error.code === "23503" ? "Không thể xóa danh mục đang có món." : error.message },
      { status: error.code === "23503" ? 409 : 400 }
    );
    return Response.json({ message: "Đã xóa danh mục" });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
